const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")


const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


// ---- Retry helper -------------------------------------------------
// Gemini occasionally returns 503 ("model overloaded") or 429 ("rate
// limited"). Both are usually transient, so we retry a few times with
// exponential backoff instead of failing the whole request immediately.
// If every retry on the primary model still fails, we fall back to a
// more stable model once before giving up for good.

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(error) {
    const status =
        error?.status ||
        error?.error?.status ||
        error?.code

    const message = String(error?.message || "")

    return (
        status === 503 ||
        status === "UNAVAILABLE" ||
        message.includes("503") ||
        message.includes("overloaded") ||
        message.includes("high demand")
    )
}

// A daily/per-minute quota exhaustion (429 RESOURCE_EXHAUSTED) won't
// resolve within a few seconds of backoff - Google tells us to retry in
// 30-60+ seconds. For these, skip the retry loop entirely and jump
// straight to the fallback model instead of wasting attempts hammering
// an already-exhausted quota.
function isQuotaExceededError(error) {
    const status =
        error?.status ||
        error?.error?.status ||
        error?.code

    const message = String(error?.message || "")

    return (
        status === 429 ||
        status === "RESOURCE_EXHAUSTED" ||
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.includes("quota")
    )
}

const PRIMARY_MODEL = "gemini-3.6-flash"
const FALLBACK_MODEL = "gemini-3.5-flash-lite"

async function generateContentWithRetry({
    contents,
    config,
    maxRetries = 3,
    baseDelayMs = 1000
}) {

    let lastError

    // Try the primary model with retries + exponential backoff.
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents,
                config
            })
        } catch (error) {
            lastError = error

            // Quota exhausted - retrying the same model won't help
            // within this request. Break immediately and fall back.
            if (isQuotaExceededError(error)) {
                console.warn(
                    `Quota exceeded on ${PRIMARY_MODEL}, skipping retries and falling back immediately.`
                )
                break
            }

            if (!isRetryableError(error) || attempt === maxRetries) {
                break
            }

            const delay = baseDelayMs * Math.pow(2, attempt)
            console.warn(
                `Gemini call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`,
                error?.message || error
            )
            await sleep(delay)
        }
    }

    // Primary model exhausted its retries (or hit a quota limit).
    // Try once on the fallback model before giving up.
    if (isRetryableError(lastError) || isQuotaExceededError(lastError)) {
        try {
            console.warn(
                `Falling back to ${FALLBACK_MODEL} after repeated failures on ${PRIMARY_MODEL}`
            )
            return await ai.models.generateContent({
                model: FALLBACK_MODEL,
                contents,
                config
            })
        } catch (fallbackError) {
            lastError = fallbackError
        }
    }

    throw lastError
}
// ---------------------------------------------------------------------


// ---- JSON repair helper -----------------------------------------------
// Smaller "lite" fallback models occasionally emit each object in an
// array as a broken/flattened STRING instead of a real nested object -
// e.g. the model writes `question": "...", "intention": "...", "answer":
// "..."` as one string, having dropped the surrounding `{` and `}`.
// Sometimes it even splits one object's fields across two consecutive
// array entries. This walks the raw array, re-assembles consecutive
// string fragments by wrapping/joining them until they form valid JSON
// objects containing all the required keys, and drops anything that
// truly can't be recovered (so the rest of the report can still succeed
// instead of the whole request failing).

function tryParseAsObject(str, requiredKeys) {

    const candidates = [
        str,
        `{${str}}`,
        `{"${str}`,
        `{"${str}"}`,
        `{"${str}}`,
        `${str}}`,
        `${str}"}`
    ]

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate)

            if (
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed) &&
                requiredKeys.every((key) => key in parsed)
            ) {
                return parsed
            }
        } catch (err) {
            // try the next candidate shape
        }
    }

    return null
}

function repairObjectArray(rawArray, requiredKeys) {

    if (!Array.isArray(rawArray)) {
        return { repaired: [], leftovers: [] }
    }

    const repaired = []
    const leftovers = []
    let buffer = ""
    let bufferParts = []

    for (const item of rawArray) {

        if (item && typeof item === "object" && !Array.isArray(item)) {
            if (buffer) {
                leftovers.push(...bufferParts)
                buffer = ""
                bufferParts = []
            }
            repaired.push(item)
            continue
        }

        if (typeof item !== "string") {
            continue
        }

        bufferParts.push(item)
        buffer = buffer ? `${buffer}, "${item}` : item

        const parsed = tryParseAsObject(buffer, requiredKeys)

        if (parsed) {
            repaired.push(parsed)
            buffer = ""
            bufferParts = []
        }
    }

    if (buffer) {
        leftovers.push(...bufferParts)
    }

    return { repaired, leftovers }
}

// When an item has no embedded key:value structure at all (just plain
// text - e.g. the model returned the question as a bare string with no
// "question"/"intention"/"answer" markers), we can't reconstruct the
// original object. Instead of losing that content entirely, treat the
// plain text as the item's primary field and fill the rest with
// reasonable generic defaults so the report still has real content.
function fallbackFromPlainText(leftovers, primaryKey, defaults) {
    return leftovers
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({
            [primaryKey]: text,
            ...defaults
        }))
}

function fallbackPreparationPlan(leftovers) {
    return leftovers
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text, index) => {
            const dayMatch = text.match(/day\s*(\d+)/i)
            const day = dayMatch ? Number(dayMatch[1]) : index + 1
            return {
                day,
                focus: text,
                tasks: [text]
            }
        })
}

function repairInterviewReportShape(jsonData) {

    if (!jsonData || typeof jsonData !== "object") {
        return jsonData
    }

    const technical = repairObjectArray(
        jsonData.technicalQuestions,
        ["question", "intention", "answer"]
    )

    const behavioral = repairObjectArray(
        jsonData.behavioralQuestions,
        ["question", "intention", "answer"]
    )

    const skills = repairObjectArray(
        jsonData.skillGaps,
        ["skill"]
    )

    const plan = repairObjectArray(
        jsonData.preparationPlan,
        ["day", "focus"]
    )

    return {
        ...jsonData,

        technicalQuestions: [
            ...(technical.repaired || []),
            ...fallbackFromPlainText(technical.leftovers || [], "question", {
                intention: "Assess the candidate's understanding and communication of this topic.",
                answer: "Answer will vary based on the candidate's specific experience - use this as a discussion prompt."
            })
        ],

        behavioralQuestions: [
            ...(behavioral.repaired || []),
            ...fallbackFromPlainText(behavioral.leftovers || [], "question", {
                intention: "Assess the candidate's soft skills and past experience.",
                answer: "Answer will vary based on the candidate's specific experience - use this as a discussion prompt."
            })
        ],

        skillGaps: [
            ...(skills.repaired || []),
            ...fallbackFromPlainText(skills.leftovers || [], "skill", {
                severity: "medium"
            })
        ],

        preparationPlan: [
            ...(plan.repaired || []),
            ...fallbackPreparationPlan(plan.leftovers || [])
        ]
    }
}
// ---------------------------------------------------------------------


const interviewReportSchema = z.object({

    title: z.string().describe(
        "The job title for which this interview report is generated"
    ),

    matchScore: z.number().min(0).max(100).describe(
        "A number between 0 and 100 representing how well the candidate matches the job"
    ),

    technicalQuestions: z.array(
        z.object({

            question: z.string(),

            intention: z.string(),

            answer: z.string()

        })
    ).min(3, "technicalQuestions must not be empty"),

    behavioralQuestions: z.array(
        z.object({

            question: z.string(),

            intention: z.string(),

            answer: z.string()

        })
    ).min(3, "behavioralQuestions must not be empty"),

    skillGaps: z.array(
        z.object({

            skill: z.string(),

            severity: z.enum([
                "low",
                "medium",
                "high"
            ]).catch("medium")

        })
    ).min(1, "skillGaps must not be empty"),

    preparationPlan: z.array(
        z.object({

            day: z.preprocess((val) => {
                if (typeof val === "string") {
                    const match = val.match(/\d+/)
                    return match ? Number(match[0]) : val
                }
                return val
            }, z.number()),

            focus: z.string(),

            tasks: z.array(
                z.string()
            ).catch([])

        })
    ).min(1, "preparationPlan must not be empty")

})


async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
}) {

    const basePrompt = `
You are an expert technical interviewer and career coach.

Generate an interview preparation report for the candidate.

IMPORTANT:
You MUST return ONLY the following JSON structure.

Required fields:

title
matchScore
technicalQuestions
behavioralQuestions
skillGaps
preparationPlan

DO NOT return these fields:

candidate_name
candidateDetails
candidate_details
applied_position
overall_match_score
summary
key_strengths
areas_for_improvement
skills_evaluation
project_evaluations
recommended_interview_questions
recommendation_status

The title must contain the job position.

matchScore must be a NUMBER between 0 and 100.
Do NOT return matchScore as "88%".
Return 88 instead.

technicalQuestions must contain technical interview questions.
technicalQuestions must NOT be an empty array - include at least 3 questions.
Each technical question must contain:
question
intention
answer

behavioralQuestions must contain behavioral interview questions.
behavioralQuestions must NOT be an empty array - include at least 3 questions.
Each behavioral question must contain:
question
intention
answer

skillGaps must contain skills missing or weak for this job.
skillGaps must NOT be an empty array - include at least 1 skill gap.
Each skill gap must contain:
skill
severity

severity must be exactly:
low
medium
high

preparationPlan must contain day-wise preparation.
preparationPlan must NOT be an empty array - include at least 3 days.
Each day must contain:
day
focus
tasks

tasks must be an array of strings.

Candidate Resume:
${resume || "No resume provided"}

Candidate Self Description:
${selfDescription || "No self description provided"}

Job Description:
${jobDescription}

Analyze the candidate carefully and generate a realistic interview preparation report.
`

    // Some models (especially smaller "lite" fallback models) sometimes
    // ignore the nested object schema and return plain strings inside
    // technicalQuestions / behavioralQuestions / skillGaps arrays
    // instead of objects. If validation fails, we retry with the exact
    // validation errors appended to the prompt so the model can correct
    // itself, instead of crashing the whole request.
    const maxSchemaRetries = 2
    let lastValidationError = null

    for (let attempt = 0; attempt <= maxSchemaRetries; attempt++) {

        const prompt = attempt === 0
            ? basePrompt
            : `${basePrompt}

IMPORTANT - YOUR PREVIOUS RESPONSE WAS INVALID:
${lastValidationError}

Every item inside technicalQuestions, behavioralQuestions and skillGaps
MUST be a JSON OBJECT with the exact fields described above - NEVER a
plain string. Every item inside preparationPlan MUST be an object with
day, focus and tasks (tasks is an array of strings). Fix this and
return ONLY the corrected valid JSON.`

        const response = await generateContentWithRetry({
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: zodToJsonSchema(
                    interviewReportSchema
                )
            }
        })

        console.log(
            "RAW AI RESPONSE:",
            response.text
        )

        let jsonData

        try {
            jsonData = JSON.parse(response.text)
        } catch (parseError) {
            lastValidationError = `Response was not valid JSON: ${parseError.message}`
            console.warn(
                `AI response was not valid JSON (attempt ${attempt + 1}/${maxSchemaRetries + 1}), retrying...`
            )
            continue
        }

        // Attempt to auto-repair known corruption patterns (flattened
        // objects, split fragments) before validating.
        const repairedData = repairInterviewReportShape(jsonData)

        const result = interviewReportSchema.safeParse(repairedData)

        if (result.success) {
            console.log(
                "AI REPORT:",
                JSON.stringify(result.data, null, 2)
            )
            return result.data
        }

        lastValidationError = JSON.stringify(result.error.issues, null, 2)
        console.warn(
            `AI response failed schema validation (attempt ${attempt + 1}/${maxSchemaRetries + 1}), retrying with corrective prompt:`,
            lastValidationError
        )
    }

    throw new Error(
        `AI failed to return a validly structured interview report after ${maxSchemaRetries + 1} attempts. Last error: ${lastValidationError}`
    )
}


async function generatePdfFromHtml(
    htmlContent
) {

    const browser =
        await puppeteer.launch()


    const page =
        await browser.newPage()


    await page.setContent(
        htmlContent,
        {
            waitUntil: "networkidle0"
        }
    )


    const pdfBuffer =
        await page.pdf({

            format: "A4",

            margin: {

                top: "20mm",

                bottom: "20mm",

                left: "15mm",

                right: "15mm"

            }

        })


    await browser.close()


    return pdfBuffer
}


async function generateResumePdf({
    resume,
    selfDescription,
    jobDescription
}) {

    const resumePdfSchema =
        z.object({

            html: z.string()

        })


    const prompt = `
Generate a professional ATS-friendly resume.

Candidate Resume:
${resume || "No resume provided"}

Candidate Self Description:
${selfDescription || "No self description provided"}

Job Description:
${jobDescription}

Return ONLY JSON with this field:

html

The html field must contain complete HTML for the resume.

The resume should be:
- ATS friendly
- professional
- concise
- 1-2 pages
- tailored to the job description
- human written
- easy to read
`

    const response = await generateContentWithRetry({
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: zodToJsonSchema(
                resumePdfSchema
            )
        }
    })


    const jsonContent =
        JSON.parse(
            response.text
        )


    const pdfBuffer =
        await generatePdfFromHtml(
            jsonContent.html
        )


    return pdfBuffer
}


module.exports = {

    generateInterviewReport,

    generateResumePdf

}