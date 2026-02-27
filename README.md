# AI Smart Job Application Assistant

An AI-powered full-stack web application that automates job application form filling on **Google Forms, Microsoft Forms, and similar platforms**, and optimizes applications using semantic matching and intelligent response generation.

## ✨ Features

- 🔐 **Secure Authentication** — JWT-based user auth with bcrypt password hashing
- 👤 **Professional Profile** — Store skills, experience, education, and links
- 📄 **Resume Manager** — Upload and manage multiple PDF resumes
- 🤖 **AI Skill Matching** — Semantic similarity scoring using Sentence Transformers
- 💬 **AI Answer Generator** — LLM-powered tailored responses to application questions
- 📊 **JD Analyzer** — Parse job descriptions into structured requirements
- 🧩 **Smart Auto-Fill** — Playwright-based automation for Google Forms, MS Forms, Typeform
- 📈 **Application Tracker** — Dashboard with status badges, filters, and stats

## 🛠️ Tech Stack

| Layer      | Tech                               |
| ---------- | ---------------------------------- |
| Frontend   | React + Tailwind CSS + Vite        |
| Backend    | FastAPI + SQLAlchemy + SQLite      |
| Auth       | JWT + bcrypt                       |
| AI         | Sentence Transformers + OpenAI API |
| Automation | Playwright                         |
| Deploy     | Docker + Docker Compose            |

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **pip** and **npm**

### 1. Clone & configure

```bash
git clone <repo-url>
cd job-application-assistant
cp .env.example .env
# Edit .env with your SECRET_KEY and optional LLM_API_KEY
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate     # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app

Visit **http://localhost:5173** → Register → Start using!

## 🐳 Docker

```bash
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models.py            # ORM models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── auth.py              # JWT authentication
│   │   ├── routers/             # API route handlers
│   │   └── services/            # AI + Autofill services
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/               # React pages
│   │   ├── components/          # Reusable components
│   │   ├── context/             # Auth context
│   │   └── api.js               # Axios client
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

## 📝 API Endpoints

| Method              | Endpoint                  | Description          |
| ------------------- | ------------------------- | -------------------- |
| POST                | `/api/auth/register`      | Register new user    |
| POST                | `/api/auth/login`         | Login & get JWT      |
| GET/PUT             | `/api/profile`            | User profile CRUD    |
| GET/POST/DELETE     | `/api/resumes`            | Resume management    |
| GET/POST/PUT/DELETE | `/api/applications`       | Application tracking |
| POST                | `/api/ai/match`           | Skill match scoring  |
| POST                | `/api/ai/generate-answer` | AI answer generation |
| POST                | `/api/ai/analyze-jd`      | JD parsing           |
| POST                | `/api/ai/detect-fields`   | Form field detection |
| POST                | `/api/ai/fill-form`       | Auto-fill form       |
