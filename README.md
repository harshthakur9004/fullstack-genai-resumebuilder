# 🧠 AI-Powered Resume & Interview Analyzer

A full-stack AI platform that evaluates candidate resumes against target job descriptions, detects skill gaps, generates personalized interview preparation plans, and produces ATS-optimized resumes — all in one place.


---

## 📌 Overview

Most candidates struggle to know whether their resume is good enough for a specific job, and separately struggle to prepare for interviews. This project solves both problems in a single platform:

1. Upload your resume and paste a target job description.
2. The AI (Google Gemini API) parses your resume, compares it against the job requirements, and calculates a match score.
3. Missing skills (skill gaps) are highlighted clearly.
4. Personalized technical and behavioral interview questions are generated based on your profile and the target role.
5. An ATS-optimized, recruiter-ready resume can be generated and downloaded as a PDF.

---

## ✨ Features

- 🔐 **Secure Authentication** — JWT-based login with HTTP-only cookies, bcrypt password hashing, and token blacklisting on logout.
- 📄 **AI Resume Parsing** — Extracts skills, experience, and structure from uploaded resumes using the Gemini API.
- 🎯 **Job Match Scoring** — Compares resume content against a job description and returns a quantified match score.
- 🧩 **Skill Gap Detection** — Identifies exactly which required skills are missing from the candidate's resume.
- 💬 **Personalized Interview Questions** — Generates technical and behavioral questions tailored to the candidate's background and target role.
- ✅ **Validated AI Output** — All AI responses are validated against strict schemas (Zod) before being stored or displayed, preventing malformed data.
- 🖨️ **ATS-Optimized PDF Generation** — Dynamically builds and exports a clean, ATS-friendly resume using Puppeteer.
- 📊 **Dashboard & Reports** — Stores and displays match scores, skill gaps, and preparation plans per user.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js, React Router, Context API, Tailwind CSS, Vite |
| **Backend** | Node.js, Express.js, REST APIs |
| **Database** | MongoDB, Mongoose |
| **Authentication** | JWT, bcrypt, HTTP-only Cookies, Token Blacklisting |
| **AI / GenAI** | Google Gemini API, Prompt Engineering |
| **File Handling** | Multer (uploads), Puppeteer (PDF generation) |
| **Email** | Nodemailer (OTP & notifications) |
| **Validation** | Zod |
| **Tools** | Git, GitHub, Postman |

---

## 🏗️ Architecture / How It Works

```
User → React Frontend
          │
          ▼
   Express REST API (Node.js)
          │
   ┌──────┼───────────────┐
   ▼      ▼               ▼
JWT Auth  Gemini API   MongoDB (Mongoose)
(bcrypt)  (resume +     (Users, Reports,
          job match,     Match Scores,
          Q generation)  Skill Gaps)
          │
          ▼
   Zod Validation (ensures AI output is well-structured)
          │
          ▼
   Puppeteer → ATS-Optimized Resume PDF
```

**Flow:**
1. User signs up / logs in → password hashed with bcrypt → JWT issued and stored in an HTTP-only cookie.
2. User uploads a resume and pastes a job description.
3. Backend sends resume + job description to the Gemini API with an engineered prompt.
4. AI response is validated using Zod schemas, then saved to MongoDB.
5. Frontend displays the match score, skill gaps, and generated interview questions.
6. User can generate and download an ATS-optimized resume PDF via Puppeteer.

---

## 📂 Project Structure

```
ai-resume-analyzer/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── context/         # Context API (auth state)
│   │   ├── pages/
│   │   └── App.jsx
│   └── package.json
│
├── server/                  # Express backend
│   ├── config/               # DB connection, env setup
│   ├── controllers/
│   ├── middleware/           # Auth, error handling
│   ├── models/                # Mongoose schemas
│   ├── routes/
│   ├── services/              # Gemini API integration, PDF generation
│   ├── utils/                 # Zod schemas, helpers
│   └── server.js
│
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- A Google Gemini API key

### 1. Clone the repository
```bash
git clone https://github.com/harshthakur9004/ai-resume-analyzer.git
cd ai-resume-analyzer
```

### 2. Setup the Backend
```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_app_password
```

Run the backend:
```bash
npm run dev
```

### 3. Setup the Frontend
```bash
cd ../client
npm install
npm run dev
```

The app should now be running at `http://localhost:5173` (frontend) and `http://localhost:5000` (backend).

---

## 🔑 API Endpoints (Sample)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT (cookie) |
| POST | `/api/auth/logout` | Logout and blacklist token |
| POST | `/api/resume/upload` | Upload resume and job description |
| GET | `/api/resume/analyze/:id` | Get AI match score & skill gaps |
| GET | `/api/interview/questions/:id` | Get generated interview questions |
| GET | `/api/resume/download/:id` | Download ATS-optimized resume PDF |

---

## 🚀 Future Improvements

- Add caching for repeated resume analyses to reduce AI API costs
- Add unit and integration tests
- Support multiple AI providers as fallback
- Move file storage to cloud (AWS S3 / Cloudinary)
- Add a job queue (Redis/Bull) for handling AI requests at scale

---

## 👤 Author

**Harsh Kumar**
- GitHub: [@harshthakur9004](https://github.com/harshthakur9004)
- LinkedIn: [Harsh Kumar](https://linkedin.com)
- Email: kumarharsh.7409@gmail.com

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).