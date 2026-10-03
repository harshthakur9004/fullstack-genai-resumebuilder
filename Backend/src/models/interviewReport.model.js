const mongoose = require("mongoose")


const technicalQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, "question is required"]
    },
    intention: {
        type: String,
        required: [true, "intention is required"]
    },
    answer: {
        type: String,
        required: [true, "answer is required"]
    }
}, {
    _id: false
})


const behavioralQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, "question is required"]
    },
    intention: {
        type: String,
        required: [true, "intention is required"]
    },
    answer: {
        type: String,
        required: [true, "answer is required"]
    }
}, {
    _id: false
})


const skillSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: [true, "skill is required"]
    },
    severity: {
        type: String,
        enum: ["low", "medium", "high"],
        required: [true, "severity is required"]
    }
}, {
    _id: false
})


const preparationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: [true, "day is required"]
    },
    focus: {
        type: String,
        required: [true, "focus is required"]
    },
    tasks: [{
        type: String,
        required: [true, "task is required"]
    }]
})


const interviewReportSchema = new mongoose.Schema({

    title: {
        type: String,
        required: [true, "title is required"]
    },

    jobDescription: {
        type: String,
        required: [true, "job description is required"]
    },

    resume: {
        type: String
    },

    selfDescription: {
        type: String
    },

    matchScore: {
        type: Number,
        min: 0,
        max: 100
    },

    technicalQuestions: [
        technicalQuestionSchema
    ],

    behavioralQuestions: [
        behavioralQuestionSchema
    ],

    skillGaps: [
        skillSchema
    ],

    preparationPlan: [
        preparationPlanSchema
    ],

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }

}, {
    timestamps: true
})


const interviewReportModel = mongoose.model(
    "InterviewReport",
    interviewReportSchema
)


module.exports = interviewReportModel