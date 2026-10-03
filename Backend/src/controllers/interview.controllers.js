const pdfParse = require("pdf-parse")
const {
    generateInterviewReport,
    generateResumePdf
} = require("../services/ai.service")

const interviewReportModel = require("../models/interviewReport.model")


/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {

    const { selfDescription, jobDescription } = req.body

    if (!jobDescription) {
        return res.status(400).json({
            message: "Job description is required."
        })
    }

    if (!req.file && !selfDescription) {
        return res.status(400).json({
            message: "Either a resume or a self description is required."
        })
    }

    let resumeText = ""

    if (req.file) {
        try {
            const resumeContent = await (
                new pdfParse.PDFParse(
                    Uint8Array.from(req.file.buffer)
                )
            ).getText()

            resumeText = resumeContent.text
        } catch (pdfError) {
            console.error("PDF PARSE FAILED:", pdfError?.message || pdfError)

            return res.status(400).json({
                message: "The uploaded file could not be read as a PDF. Please upload a valid, non-corrupted PDF file (DOCX is not supported yet)."
            })
        }
    }

    let interViewReportByAi

    try {
        interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription,
            jobDescription
        })
    } catch (aiError) {
        console.error("AI REPORT GENERATION FAILED:", aiError?.message || aiError)

        return res.status(503).json({
            message: "The AI service is currently having trouble generating your report. Please try again in a minute."
        })
    }

    console.log(
        "AI REPORT:",
        JSON.stringify(interViewReportByAi, null, 2)
    )

    const interviewReport = await interviewReportModel.create({
        user: req.user.id,
        resume: resumeText,
        selfDescription,
        jobDescription,
        ...interViewReportByAi
    })

    res.status(201).json({
        message: "Interview report generated successfully.",
        interviewReport
    })

}


/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    const interviewReport = await interviewReportModel.findOne({
        _id: interviewId,
        user: req.user.id
    })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })

}


/**
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {

    const interviewReports = await interviewReportModel
        .find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .select(
            "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan"
        )

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })

}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {

    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findById(
        interviewReportId
    )

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const {
        resume,
        jobDescription,
        selfDescription
    } = interviewReport

    const pdfBuffer = await generateResumePdf({
        resume,
        jobDescription,
        selfDescription
    })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)

}


module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController
}