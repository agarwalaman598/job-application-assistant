# Job Application Assistant

An AI-powered full-stack web app that helps you track job applications, match your resume to job descriptions, auto-fill application forms, and generate tailored answers to application questions.

## Features

- **Auth** — Email/password registration with email verification, JWT via httpOnly cookies, password reset
- **Profile** — Store skills, experience, education, and social links
- **Resume Manager** — Upload and manage multiple PDF resumes (stored on Cloudflare R2)
- **AI Match Score** — Paste a job description and get a percentage match score against your resume + skills breakdown
- **JD Analyzer** — Extracts required skills, experience level, responsibilities, and resume fit from any job description
- **AI Answer Generator** — Generates tailored answers to application questions using your profile
- **Smart Auto-Fill** — Detects fields on Google Forms / Microsoft Forms and maps your profile to them
- **Application Tracker** — Log applications with status (Applied, Interview, Offer, Rejected), notes, and filters
- **Dashboard** — Stats overview and recent application history

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4 |
| Backend | FastAPI, SQLAlchemy 2, Alembic |
| Database | PostgreSQL (Neon) |
| Auth | JWT (httpOnly cookie), bcrypt |
| AI / LLM | Groq (llama-3.3-70b) via OpenAI-compatible API |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend |
| Scheduler | APScheduler (cleanup unverified accounts) |

## Local Development

### Prerequisites

- Python 3.11
- Node.js 18+

### 1. Clone and configure

```bash
git clone https://github.com/agarwalaman598/job-application-assistant.git
cd job-application-assistant
```

Create a `.env` file in the project root — see the Environment Variables section below.

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000
```

API docs available at **http://localhost:8000/docs**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

## Environment Variables

Create a `.env` file in the project root:

```env
# App
SECRET_KEY=your-secret-key-here
APP_ENV=development
APP_BASE_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Database (Neon Postgres)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# LLM (Groq or any OpenAI-compatible provider)
LLM_API_KEY=your-groq-api-key
LLM_API_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=no-reply@yourdomain.com
RESEND_FROM_NAME=Job Application Assistant

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET=your-bucket-name
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_REGION=auto
```

Frontend env (in `frontend/.env`):

```env
# Leave empty for same-domain deployments.
# Set to backend URL for cross-origin (e.g. Vercel + Render).
VITE_API_URL=
```

## Deployment

### Free hosting setup

| Service | Platform | Free tier |
|---|---|---|
| Frontend | Vercel | Free forever |
| Backend | Render | 750 hrs/month |
| Database | Neon | 0.5 GB |
| Storage | Cloudflare R2 | 10 GB |
| Email | Resend | 3,000 emails/month |

### Deploy backend (Render)

1. New Web Service → connect GitHub repo
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt && alembic upgrade head`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables, plus:
   - `APP_ENV=production`
   - `FRONTEND_URL=https://yourapp.vercel.app`
   - `APP_BASE_URL=https://yourapp.vercel.app`

### Deploy frontend (Vercel)

1. New Project → import GitHub repo
2. Root directory: `frontend`
3. Framework preset: Vite
4. Add environment variable:
   - `VITE_API_URL=https://your-render-service.onrender.com`

## Project Structure

```
job-application-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, scheduler
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models.py            # ORM models
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── auth.py              # JWT decode, get_current_user
│   │   ├── routers/             # auth, profile, resume, applications, AI
│   │   └── services/            # ai_service, email_service, r2_service, autofill_service
│   ├── alembic/                 # DB migrations
│   ├── venv/                    # Python virtual environment (not committed)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/               # LoginPage, RegisterPage, DashboardPage, etc.
│   │   ├── components/          # Navbar, ProtectedRoute, MatchScoreGauge
│   │   ├── context/             # AuthContext
│   │   └── api.js               # Axios client
│   ├── public/
│   │   └── robots.txt
│   └── package.json
└── .env                         # Secret config — never commit this
```
