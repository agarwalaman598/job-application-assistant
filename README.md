<div align="center">

<h1>⚡ JobAssist AI</h1>

<p><strong>AI-Powered Job Application Assistant</strong></p>

<p><em>Track applications · Match resumes · Analyze job descriptions · Generate answers · Auto-fill forms</em></p>

<br/>

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-job--application--assistant--amber.vercel.app-4F46E5?style=for-the-badge)](https://job-application-assistant-amber.vercel.app/)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

<br/>

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)

<br/>

[![GitHub Stars](https://img.shields.io/github/stars/agarwalaman598/job-application-assistant?style=flat-square)](https://github.com/agarwalaman598/job-application-assistant/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/agarwalaman598/job-application-assistant?style=flat-square)](https://github.com/agarwalaman598/job-application-assistant/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/agarwalaman598/job-application-assistant)](https://github.com/agarwalaman598/job-application-assistant/issues)

<br/>

> **Built as a production-grade full-stack AI system — demonstrating real-world architecture, automation, and LLM integration for job seekers.**

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Features](#-core-features)
- [AI Capabilities](#-ai-capabilities)
- [Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Data Models](#-data-models)
- [Local Development](#-local-development)
- [Environment Variables](#️-environment-variables)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)

---

## 📖 Overview

Job hunting is repetitive and inefficient. Candidates rewrite the same answers, manually parse job descriptions, and lose track of dozens of open applications.

**JobAssist AI eliminates that friction** — it's a full-stack AI system that automates your entire job application workflow:

- **Analyze** job descriptions in seconds to extract skills, level, and responsibilities
- **Score** how well your resume and profile match a role — with actionable gap analysis
- **Generate** tailored, human-sounding answers to application questions
- **Auto-fill** Google Forms, Microsoft Forms, Typeform, and other job applications
- **Track** every application with status, notes, and match scores in one place
- **Learn** from your answers over time — saved Q&A pairs improve future auto-fills

---

## 🚀 Live Demo

**[→ Try it live: job-application-assistant-amber.vercel.app](https://job-application-assistant-amber.vercel.app/)**

> Create a free account, upload your resume, paste a job description, and let AI do the rest.

![JobAssist AI Demo](assets/JobAssistAI.gif)

---

## ✨ Core Features

| Feature | Description |
|---|---|
| 🔐 **Secure Auth** | Email verification, password reset, JWT via httpOnly cookies |
| 👤 **Profile Manager** | Skills, experience, education, GitHub, LinkedIn, website |
| 📄 **Resume Manager** | Upload PDFs to Cloudflare R2 or link Google Drive — set a default for AI |
| 🎯 **AI Match Scoring** | 4-dimension weighted match: keywords (40%), skills (30%), experience (20%), education (10%) |
| 🧠 **JD Analyzer** | Extract role title, required skills, nice-to-haves, level, responsibilities |
| ✍️ **AI Answer Generator** | Context-aware tailored answers to any application question |
| ⚡ **Smart Auto-Fill** | Detect fields on Google/Microsoft/Typeform/JotForm — auto-map to your profile |
| 🧠 **Answer Learning** | Submissions are saved as Q&A pairs and reused in future auto-fills |
| 📊 **Application Tracker** | Full CRUD with status (draft → applied → interview → offer → rejected) |
| 📈 **Dashboard Analytics** | Stats overview + recent applications at a glance |
| 🔁 **Background Cleanup** | APScheduler purges unverified accounts every 24 hours automatically |

---

## 🧠 AI Capabilities

### 1. Resume Match Scoring

Returns a **0–100 score** with a 4-dimension weighted breakdown:

| Dimension | Weight | What It Checks |
|---|---|---|
| Keyword Coverage | 40% | JD keyword frequency in resume + profile |
| Skills Match | 30% | Direct skill-by-skill comparison |
| Experience Level | 20% | Seniority alignment |
| Education | 10% | Degree / qualification fit |

Also returns: `matched_keywords`, `missing_keywords`, `matched_skills`, `missing_skills`, 4–5 `suggestions`, and a `reasoning` summary. Features a deterministic fallback and a sanity-check blending mechanism when LLM score diverges >25 points from regex-based scoring.

### 2. Job Description Analysis

Extracts structured data from any JD text:
- `title`, `company`, `experience_level` (Junior / Mid-level / Senior / Lead)
- `required_skills`, `nice_to_have_skills`, `key_responsibilities`, `summary`
- When resume is available: `resume_fit`, `resume_gaps`, `resume_strengths`

### 3. AI Answer Generation

Generates concise, personalized (<200 words) answers to open-ended application questions:
- *"Why are you interested in this role?"*
- *"Describe your most relevant experience."*
- *"Why should we hire you?"*

Uses your full profile (summary, skills, experience) + resume text as context.

### 4. Smart Form Field Detection

Fetches a form URL using browser-like headers — **no Playwright, no browser required**. Supports:
- Google Forms
- Microsoft Forms
- Typeform
- JotForm
- Generic HTML forms

Detects field type: `text`, `textarea`, `radio`, `dropdown`, `checkbox`, `date`, `time`

### 5. AI Auto-Map & Form Fill

LLM maps each detected field to your profile data (name, email, phone, LinkedIn, GitHub, skills, experience, education, resume link, saved Q&A). For constrained fields (dropdowns/radio), snaps AI value to nearest valid option using exact → containment → word-overlap matching.

Generates a pre-filled URL for Google Forms natively.

---

## 🏗 System Architecture

```mermaid
flowchart TD
    User([fa:fa-user User Browser])

    User -->|HTTPS| Frontend[React 19 + Vite\nVercel]

    Frontend -->|REST + JWT Cookie| Backend[FastAPI\nRender]

    Backend --> Auth[JWT Auth\nbcrypt + python-jose]
    Backend --> DB[(PostgreSQL\nNeon Cloud)]
    Backend --> Storage[(Cloudflare R2\nResume PDFs)]
    Backend --> LLM[Groq / OpenAI\nLlama-3.3-70b]
    Backend --> Email[Resend\nTransactional Email]
    Backend --> Scheduler[APScheduler\nBackground Jobs]

    Storage --> Resumes[Resume Files]
    DB --> AppData[Applications · Profiles\nQ&A Pairs · Email Logs]
    LLM --> AIFeatures[Match Scoring · JD Analysis\nAnswer Gen · Form Mapping]
    Scheduler --> Cleanup[Purge Unverified\nAccounts Every 24h]
```

---

## 🛠 Tech Stack

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 19.x | UI framework |
| React Router | 7.x | Client-side routing |
| Vite | 7.x | Build tool |
| Tailwind CSS | 4.x | Utility-first styling |
| Axios | 1.x | HTTP client |
| Lucide React | 0.575 | Icon library |
| Sonner | 2.x | Toast notifications |
| React Helmet Async | 2.x | `<title>` management |

### Backend
| Package | Version | Purpose |
|---|---|---|
| FastAPI | 0.115 | Web framework |
| Uvicorn | 0.30 | ASGI server |
| SQLAlchemy | 2.0 | ORM |
| Alembic | 1.14 | Database migrations |
| Pydantic | 2.10 | Data validation |
| psycopg | 3.2 | PostgreSQL async driver |
| python-jose | 3.3 | JWT (HS256) |
| bcrypt | 4.2 | Password hashing |
| PyPDF2 | 3.0 | PDF text extraction |
| httpx | 0.27 | Async HTTP (form fetching) |
| openai | 1.58 | OpenAI-compatible LLM SDK |
| boto3 | 1.35 | Cloudflare R2 (S3-compatible) |
| resend | 2.10 | Transactional email |
| slowapi | 0.1.9 | Rate limiting |
| APScheduler | 3.10 | Background job scheduler |

### Infrastructure
| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | CDN-deployed SPA |
| Backend | Render | 750 free hours/month |
| Database | Neon (PostgreSQL) | Serverless, 0.5 GB free |
| File Storage | Cloudflare R2 | 10 GB free, S3-compatible |
| Email | Resend | 3,000 emails/month free |
| LLM | Groq (Llama-3.3-70b) | Any OpenAI-compatible provider |

---

## 📁 Project Structure

```
job-application-assistant/
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, middleware, routers
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models.py            # ORM models (User, Profile, Resume, Application, QAPair)
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── auth.py              # JWT creation + verification
│   │   ├── rate_limit.py        # SlowAPI rate limiter config
│   │   ├── utils.py             # Shared helpers
│   │   ├── routers/
│   │   │   ├── auth_router.py          # Register, login, logout, me
│   │   │   ├── auth_email_router.py    # Email verify, forgot/reset password
│   │   │   ├── profile_router.py       # Profile CRUD + saved answers
│   │   │   ├── resume_router.py        # Resume upload, link, download, delete
│   │   │   ├── application_router.py   # Application tracker CRUD
│   │   │   └── ai_router.py            # All AI endpoints
│   │   └── services/
│   │       ├── ai_service.py           # LLM calls (match, analyze, answer gen)
│   │       ├── autofill_service.py     # Form detection + field mapping
│   │       ├── r2_service.py           # Cloudflare R2 upload/download/delete
│   │       └── email_service.py        # Resend email sending
│   ├── alembic/                 # Database migration scripts
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Backend container
│
├── frontend/
│   ├── src/
│   │   ├── api.js               # Axios instance (base URL + cookies)
│   │   ├── App.jsx              # Router + ProtectedRoute setup
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx        # Stats + recent applications
│   │   │   ├── ApplicationsPage.jsx     # Application tracker
│   │   │   ├── AnalyzePage.jsx          # JD analysis + match scoring
│   │   │   ├── AutofillPage.jsx         # Smart form auto-fill
│   │   │   ├── ResumePage.jsx           # Resume manager
│   │   │   ├── ProfilePage.jsx          # Profile editor
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── VerifyEmailPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   └── ResetPasswordPage.jsx
│   │   ├── components/
│   │   │   ├── MatchScoreGauge.jsx      # SVG arc gauge for match score
│   │   │   ├── StatusBadge.jsx          # Colored application status badge
│   │   │   ├── Sidebar.jsx              # Navigation sidebar
│   │   │   ├── ProtectedRoute.jsx       # Auth guard
│   │   │   ├── ConfirmDialog.jsx        # Reusable modal
│   │   │   └── ErrorBoundary.jsx        # Render error recovery
│   │   └── context/
│   │       ├── AuthContext.jsx           # Global auth state
│   │       └── NavigationGuardContext.jsx # Unsaved changes guard
│   ├── index.html
│   ├── vite.config.js
│   └── Dockerfile               # Frontend container
│
├── docker-compose.yml           # Local development stack
└── README.md
```

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Authentication uses JWT via httpOnly cookie or `Authorization: Bearer <token>` header.

### 🔐 Auth — `/api/auth`

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/register` | — | 3/min | Create account + send verification email |
| `POST` | `/login` | — | 5/min | Login → JWT cookie + token in body |
| `POST` | `/logout` | — | — | Clear auth cookie |
| `GET` | `/me` | ✅ | — | Get current user info |
| `POST` | `/send-verification` | — | 3/15min | Resend verification email |
| `GET` | `/verify-email?token=` | — | — | Verify email address |
| `POST` | `/forgot-password` | — | 3/15min | Send password reset email |
| `POST` | `/reset-password` | — | — | Set new password with reset token |

### 👤 Profile — `/api/profile`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Get full profile (skills, experience, education, links) |
| `PUT` | `/` | Update profile fields |
| `GET` | `/saved-answers` | List saved Q&A pairs |
| `PUT` | `/saved-answers/{id}` | Edit a saved answer |
| `DELETE` | `/saved-answers/{id}` | Delete a saved answer |

### 📄 Resumes — `/api/resumes`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | List all resumes |
| `POST` | `/upload` | Upload PDF to Cloudflare R2 (max 10 MB) |
| `POST` | `/link` | Add link-only resume (Google Drive, etc.) |
| `PATCH` | `/{id}/link` | Update a resume's drive link |
| `GET` | `/{id}/download` | Stream PDF (`?mode=view` or `?mode=download`) |
| `PUT` | `/{id}/default` | Set as default resume for AI |
| `DELETE` | `/{id}` | Delete from DB + Cloudflare R2 |

### 📊 Applications — `/api/applications`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | List all applications (`?status=` filter) |
| `POST` | `/` | Create new application |
| `PUT` | `/{id}` | Update any application field |
| `DELETE` | `/{id}` | Delete application |

### 🤖 AI & Automation — `/api/ai`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/match` | Score profile + resume vs. JD (0–100, 4-dimension breakdown) |
| `POST` | `/analyze-jd` | Parse JD → title, skills, level, responsibilities |
| `POST` | `/generate-answer` | Generate tailored answer to application question |
| `POST` | `/detect-fields` | Fetch form URL → detect all input fields |
| `POST` | `/auto-map` | LLM maps detected fields to profile data |
| `POST` | `/save-answers` | Save submitted field→answer pairs for future use |
| `POST` | `/fill-form` | Generate pre-filled form URL |

### 🩺 System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API info + docs link |
| `GET` | `/health` | Database connectivity check |
| `GET` | `/robots.txt` | Blocks search engine indexing |

---

## 🗄 Data Models

<details>
<summary><strong>User</strong></summary>

| Field | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `email` | String(255) unique | |
| `hashed_password` | String(255) | bcrypt |
| `full_name` | String(255) | |
| `is_verified` | Boolean | Default `false` |
| `verification_token` | String(128) | 24-hour expiry |
| `reset_token` | String(128) | 1-hour expiry |
| `created_at` | DateTime | UTC |

</details>

<details>
<summary><strong>Profile</strong></summary>

| Field | Type | Description |
|---|---|---|
| `user_id` | FK → users | One-to-one |
| `phone` | String(50) | |
| `linkedin` | String(255) | |
| `github` | String(255) | |
| `website` | String(255) | |
| `skills` | JSON | `["Python", "React", ...]` |
| `experience` | JSON | `[{title, company, duration, ...}]` |
| `education` | JSON | List of objects |
| `summary` | Text | Used as AI context |

</details>

<details>
<summary><strong>Resume</strong></summary>

| Field | Type | Description |
|---|---|---|
| `user_id` | FK → users | Indexed |
| `filename` | String(255) | |
| `filepath` | String(500) | Local path or R2 object key |
| `drive_link` | String(1000) | Optional Google Drive link |
| `is_r2` | Boolean | `true` = stored in Cloudflare R2 |
| `is_default` | Boolean | Used by AI endpoints |
| `uploaded_at` | DateTime | |

</details>

<details>
<summary><strong>Application</strong></summary>

| Field | Type | Description |
|---|---|---|
| `user_id` | FK → users | Indexed |
| `company` | String(255) | |
| `position` | String(255) | |
| `url` | String(500) | Job posting URL |
| `status` | String(50) | `draft` · `applied` · `interview` · `offer` · `rejected` |
| `match_score` | Float | From AI analysis |
| `applied_at` | DateTime | |
| `notes` | Text | |

</details>

<details>
<summary><strong>QAPair (Saved Answers)</strong></summary>

| Field | Type | Description |
|---|---|---|
| `user_id` | FK → users | Indexed |
| `question` | Text | Form field label |
| `answer` | Text | User's answer |
| `embedding` | JSON | Reserved for future vector search |

</details>

---

## 🚀 Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- Git
- PostgreSQL database (or use [Neon](https://neon.tech/) free tier)

### 1. Clone the repository

```bash
git clone https://github.com/agarwalaman598/job-application-assistant.git
cd job-application-assistant
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables (see below)
cp .env.example .env   # then fill in your values

# Run database migrations
alembic upgrade head

# Start the development server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

App available at: http://localhost:5173

### 4. Docker (optional)

Run the full stack with Docker Compose:

```bash
docker-compose up --build
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# ── Application ─────────────────────────────────────────────
SECRET_KEY=your-super-secret-key-here
APP_ENV=development                    # "development" or "production"
APP_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173     # Comma-separated for multiple origins

# ── Database ─────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# ── LLM Provider (OpenAI-compatible) ─────────────────────────
LLM_API_KEY=your-groq-or-openai-key
LLM_API_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile

# ── Email (Resend) ────────────────────────────────────────────
RESEND_API_KEY=re_your_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=JobAssist AI

# ── Cloudflare R2 Storage ─────────────────────────────────────
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET=your-bucket-name
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_REGION=auto
```

> **Tip:** The LLM section is fully OpenAI-compatible. You can substitute any compatible provider — Groq, OpenAI, Ollama, Together AI, etc. — by changing `LLM_API_URL` and `LLM_MODEL`.

---

## 🔐 Auth Flow

```
Register → email sent (24h token) → Verify Email → account activated
                                  ↓
                         [unverified accounts auto-purged after 24h]

Login → bcrypt verify → JWT (HS256, 24h) →
  ├── Set as httpOnly cookie (secure + sameSite=none in prod)
  └── Returned in response body (stored in localStorage)

Protected Routes → JWT read from cookie OR Authorization header
Password Reset   → forgot-password email (1h token) → reset-password
```

**Security features:**
- Rate limiting on all auth endpoints (SlowAPI)
- 60-second global request timeout middleware
- PDF-only file uploads, 10 MB max, sandboxed in Cloudflare R2
- `robots.txt` on API to prevent crawling
- All cascade-deletes — removing a user wipes all associated data

---

## ☁️ Deployment

| Service | Platform | Free Tier |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) | Unlimited |
| Backend | [Render](https://render.com) | 750 hrs/month |
| Database | [Neon](https://neon.tech) | 0.5 GB |
| File Storage | [Cloudflare R2](https://cloudflare.com/r2) | 10 GB |
| Email | [Resend](https://resend.com) | 3,000/month |
| LLM | [Groq](https://groq.com) | Free tier available |

**Live deployment:**
- Frontend: [job-application-assistant-amber.vercel.app](https://job-application-assistant-amber.vercel.app/)
- Backend: Render (auto-deploys from `main` branch)

---

## 🗺 Roadmap

- [ ] **Chrome Extension** — detect and auto-fill job application fields directly in-browser
- [ ] **LinkedIn Job Scraping** — import job descriptions directly from LinkedIn
- [ ] **Resume AI Rewriting** — tailor resume content to a specific job description
- [ ] **Interview Preparation** — AI-generated practice questions + answer coaching
- [ ] **Resume Optimization** — keyword gap analysis with rewrite suggestions
- [ ] **Vector Search** — semantic Q&A retrieval using saved answer embeddings
- [ ] **Multi-resume AI Selector** — auto-pick best resume for each JD
- [ ] **Browser Extension** — auto-apply workflow across job boards

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit** your changes
   ```bash
   git commit -m "feat: add your feature description"
   ```
4. **Push** to your fork
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** against the `main` branch

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and make sure your code doesn't introduce lint errors.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Aman Agarwal**

[![GitHub](https://img.shields.io/badge/GitHub-agarwalaman598-181717?style=flat-square&logo=github)](https://github.com/agarwalaman598)

---

<div align="center">

**If this project helped you, please consider giving it a ⭐ — it means a lot!**

[⭐ Star on GitHub](https://github.com/agarwalaman598/job-application-assistant)

</div>
