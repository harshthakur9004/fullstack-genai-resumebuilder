import {
    getAllInterviewReports,
    generateInterviewReport,
    getInterviewReportById,
    generateResumePdf
} from "../services/interview.api"

import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const {
        loading,
        setLoading,
        report,
        setReport,
        reports,
        setReports
    } = context


    // Generate Interview Report
    const generateReport = async ({
        jobDescription,
        selfDescription,
        resumeFile
    }) => {

        setLoading(true)

        try {

            const response = await generateInterviewReport({
                jobDescription,
                selfDescription,
                resumeFile
            })

            console.log(
                "GENERATE RESPONSE:",
                response
            )

            setReport(response.interviewReport)

            return response.interviewReport

        } catch (error) {

            console.log(
                "GENERATE REPORT ERROR:",
                error
            )

            console.log(
                "BACKEND ERROR:",
                error.response?.data
            )

            throw error

        } finally {

            setLoading(false)

        }
    }


    // Get Interview Report By ID
    const getReportById = async (interviewId) => {

        setLoading(true)

        try {

            const response = await getInterviewReportById(
                interviewId
            )

            setReport(response.interviewReport)

            return response.interviewReport

        } catch (error) {

            console.log(
                "GET REPORT ERROR:",
                error
            )

        } finally {

            setLoading(false)

        }
    }


    // Get All Interview Reports
    const getReports = async () => {

        setLoading(true)

        try {

            const response = await getAllInterviewReports()

            setReports(response.interviewReports)

            return response.interviewReports

        } catch (error) {

            console.log(
                "GET REPORTS ERROR:",
                error
            )

        } finally {

            setLoading(false)

        }
    }


    // Generate Resume PDF
    const getResumePdf = async (interviewReportId) => {

        setLoading(true)

        try {

            const response = await generateResumePdf({
                interviewReportId
            })

            const url = window.URL.createObjectURL(
                new Blob(
                    [response],
                    { type: "application/pdf" }
                )
            )

            const link = document.createElement("a")

            link.href = url

            link.setAttribute(
                "download",
                `resume_${interviewReportId}.pdf`
            )

            document.body.appendChild(link)

            link.click()

            link.remove()

            window.URL.revokeObjectURL(url)

        } catch (error) {

            console.log(
                "RESUME PDF ERROR:",
                error
            )

        } finally {

            setLoading(false)

        }
    }


    // Load Reports
    useEffect(() => {

        if (interviewId) {

            getReportById(interviewId)

        } else {

            getReports()

        }

    }, [interviewId])


    return {
        loading,
        report,
        reports,
        generateReport,
        getReportById,
        getReports,
        getResumePdf
    }

}