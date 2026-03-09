# Architecture Overview — JobAssist AI

This document explains how the entire application is built, in plain English. No prior experience required.

---

## What is this app?

**JobAssist AI** is a web app that helps you apply for jobs more efficiently. It lets you:
- Upload and manage your resumes
- Track job applications (applied, interview, offer, rejected, etc.)
- Analyze how well your resume matches a job description (AI-powered match score)
- Auto-detect and fill out job application forms
- Generate answers to common job application questions using AI

---

## Big Picture — How the Pieces Fit Together

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│                                                                 │
│   React Frontend (Vite + Tailwind)                              │
│   e.g. /dashboard, /resume, /analyze, /applications            │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP requests (Axios)
                         │ Bearer token / httpOnly cookie
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER                              │
│                                                                 │
│   FastAPI (Python)                                              │
│   Routes: /api/auth, /api/profile, /api/resume,                │
│           /api/applications, /api/ai                           │
└────┬──────────────┬──────────────┬───────────────┬─────────────┘
     │              │              │               │
     ▼              ▼              ▼               ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│Postgres │  │Cloudflare│  │  Groq /  │  │   Resend     │
│(Database│  │ R2       │  │  OpenAI  │  │(Email sender)│
│/ SQLite)│  │(File     │  │  (AI LLM)│  │              │
└─────────┘  │ Storage) │  └──────────┘  └──────────────┘
             └──────────┘
```

Everything flows through the backend. The frontend never directly touches the database, files, or AI — it always goes through the backend API.

---

## Frontend Framework

**Framework:** React 19  
**Build Tool:** Vite  
**Styling:** Tailwind CSS v4  
**Routing:** React Router DOM v7

### What is React?
React is a JavaScript library for building user interfaces. Instead of writing raw HTML that changes on every click, you write reusable **components** (small building blocks). React automatically updates only the part of the page that changed.

### What is Vite?
Vite is the tool that compiles and serves your React code during development. It's very fast.

### Pages in this app

| Page | What it does |
|------|--------------|
| `/login`, `/register` | Authentication pages (public) |
| `/verify-email` | Email verification after signup |
| `/forgot-password`, `/reset-password` | Password recovery flow |
| `/dashboard` | Overview of your job search activity |
| `/resume` | Upload and manage resume PDFs |
| `/analyze` | AI match score — paste a job description, see how your resume stacks up |
| `/applications` | Track all your job applications and their statuses |
| `/profile` | Edit your profile (skills, experience, education) |
| `/autofill` | Detect form fields on a job application URL and auto-fill |

### Protected vs Public routes
Pages like `/dashboard` are **protected** — you must be logged in to see them. If you're not, the app redirects you to `/login`. This check is done by the `ProtectedRoute` component.

---

## Backend Framework

**Framework:** FastAPI (Python)  
**Server:** Uvicorn  
**Language:** Python

### What is FastAPI?
FastAPI is a Python web framework for building APIs. Think of an API as a waiter: the frontend (customer) makes a request, the waiter (FastAPI) processes it, goes to the kitchen (database / AI), and returns a response.

FastAPI is organized into **routers** — each router handles one area of the app:

| Router file | URL prefix | Handles |
|-------------|------------|---------|
| `auth_router.py` | `/api/auth` | Login, register, logout |
| `auth_email_router.py` | `/api/auth` | Email verification, password reset |
| `profile_router.py` | `/api/profile` | Get/update user profile |
| `resume_router.py` | `/api/resume` | Upload/list/delete resumes |
| `application_router.py` | `/api/applications` | CRUD for job applications |
| `ai_router.py` | `/api/ai` | AI match scoring, form autofill, answer generation |

---

## Database

**Primary (production):** PostgreSQL  
**Fallback (local dev):** SQLite  
**ORM:** SQLAlchemy  
**Migrations:** Alembic

### What is a database?
A database is where all the app's data is permanently stored — user accounts, resumes, applications, etc. Think of it as a structured spreadsheet that the backend reads from and writes to.

### What is SQLAlchemy?
Instead of writing raw SQL queries like `SELECT * FROM users`, SQLAlchemy lets you write Python code that translates into SQL automatically. Each database table is represented as a Python class (called a **model**).

### What is Alembic?
Alembic handles **migrations** — when you change a table (e.g., add a new column), Alembic creates a versioned script so the database schema can be updated safely without losing data.

### Tables in the database

| Table | What it stores |
|-------|---------------|
| `users` | Account info — email, hashed password, verification status |
| `profiles` | Extended info — phone, LinkedIn, GitHub, skills, experience, education |
| `resumes` | Metadata about uploaded PDF resumes (filename, storage location) |
| `applications` | Job applications — company, position, status, match score, notes |
| `qa_pairs` | Saved Q&A pairs for interview prep |
| `email_logs` | Log of every email sent (for debugging and rate limiting) |

---

## Authentication

**Method:** JWT (JSON Web Tokens)  
**Password hashing:** bcrypt  
**Token storage:** httpOnly cookie (primary) + `localStorage` (fallback)

### How login works — step by step

1. You enter your email and password and click "Login".
2. The frontend sends your credentials to `POST /api/auth/login`.
3. The backend looks up your email in the `users` table.
4. It uses **bcrypt** to check if your password matches the stored hash. (Passwords are never stored in plain text — only an unreadable scrambled version.)
5. If valid, the backend generates a **JWT token** — a signed string that proves you are who you say you are. It expires after 24 hours.
6. The token is sent back as an **httpOnly cookie** (a cookie JavaScript cannot read, which protects against XSS attacks). It's also saved to `localStorage` as a fallback for API clients.
7. On every future request, Axios automatically attaches the token. The backend decodes it to identify you.

### Email verification
When you register, you receive an email with a one-time verification link. Until you click it, your account is marked `is_verified = False` and you can't log in fully. Unverified accounts older than 24 hours are automatically deleted by a background scheduler.

### Password reset
Clicking "Forgot password" sends an email with a secure reset link. That link contains a short-lived token tied to your account. When you visit the link and submit a new password, the token is consumed and cannot be reused.

---

## How the Frontend Talks to the Backend

**Library used:** Axios (a JavaScript HTTP client)

The file `frontend/src/api.js` is the central place where all HTTP communication is configured. It does two important things:

### 1. Attaches your token automatically
Every time the frontend makes a request (e.g., "load my applications"), Axios automatically adds your JWT token to the `Authorization` header:

```
Authorization: Bearer eyJhbGci...
```

You never have to manually add the token in every page.

### 2. Handles session expiry
If the backend responds with `401 Unauthorized` (your token expired or is invalid), Axios automatically:
- Removes the token from `localStorage`
- Redirects you to `/login`
- Shows a "session expired" message

This means every page is protected automatically — no extra code needed per page.

---

## How Data Is Stored

Data in this app is stored in two places:

### 1. PostgreSQL / SQLite (structured data)
All text-based data lives here: user accounts, profile info, application tracking records, Q&A pairs, and email logs. This database is queried by SQLAlchemy on every request.

### 2. Cloudflare R2 (file storage)
Resume PDF files are stored in **Cloudflare R2** — an object storage service (similar to Amazon S3). R2 is used because databases are not designed to store large binary files. When you upload a resume:
1. The PDF bytes are sent to the backend.
2. The backend uploads the file to R2 using `boto3` (Amazon S3-compatible SDK).
3. The R2 object key (like a file path: `resumes/abc123_resume.pdf`) is saved in the `resumes` table.
4. When AI needs to read your resume, the backend downloads it from R2 and extracts text on the fly.

---

## Major Modules

### 1. Auth Module (`auth_router.py`, `auth_email_router.py`, `auth.py`)
Handles the full identity lifecycle: registration, email verification, login, logout, password reset. Uses JWT + bcrypt. A background scheduler (APScheduler) runs every 24 hours to clean up unverified accounts.

### 2. Profile Module (`profile_router.py`)
Lets users store their full professional profile: contact info, skills list, work experience, education history. This data feeds into AI features (e.g., auto-answering questions).

### 3. Resume Module (`resume_router.py`, `r2_service.py`)
Handles PDF uploads, storage in Cloudflare R2, and marking a "default" resume. The module supports multiple resumes per user and can extract text from PDFs using `PyPDF2`.

### 4. Applications Module (`application_router.py`)
A tracker for all your job applications. Each application stores:
- Company name and position title
- Job posting URL
- Status: `draft → applied → interview → offer / rejected`
- Match score (if analyzed)
- Free-text notes

### 5. AI Module (`ai_router.py`, `ai_service.py`)
The brain of the app. Uses a configurable LLM (Large Language Model) via an OpenAI-compatible API. Supported providers include **Groq**, **OpenAI**, and **Ollama** (local). Features:

| Feature | What it does |
|---------|-------------|
| **Match Score** | Compares your resume text against a job description. Returns a 0–100 score with a breakdown (skills match, experience match, etc.) |
| **JD Analysis** | Parses a job description and extracts key requirements, required skills, and experience level |
| **Answer Generation** | Given a job application question (e.g., "Why do you want to work here?"), generates a tailored answer using your profile |
| **Auto-map** | Maps form fields to your profile data automatically |

### 6. Autofill Module (`autofill_service.py`)
Detects form fields on a job application URL (Google Forms, Microsoft Forms, Typeform, JotForm, or generic HTML forms) by fetching the page HTML and parsing it — no browser needed. Then generates a pre-filled URL or fill instructions from your profile data.

### 7. Email Module (`email_service.py`)
Sends transactional emails (verification, password reset) using the **Resend** API. Every email sent is logged to the `email_logs` table.

### 8. Rate Limiting (`rate_limit.py`)
Uses **SlowAPI** to limit how many requests a single user or IP can make in a given time window. This prevents abuse (especially of expensive AI endpoints).

---

## External Services Used

| Service | Why it's used |
|---------|--------------|
| **Cloudflare R2** | Store and serve resume PDF files (S3-compatible object storage) |
| **Groq / OpenAI** | Provide the LLM (AI model) for match scoring, answer generation, JD analysis |
| **Resend** | Send transactional emails (verification, password reset) |
| **PostgreSQL** (e.g., on Render) | Production database hosting |
| **Vercel** | Host the React frontend (automatic deploys from Git) |
| **Render** | Host the FastAPI backend (Docker container) |

---

## Deployment

The app is split into two independently deployable services:

```
Git push
   │
   ├─▶ Vercel  ──▶  Builds React (Vite) ──▶  Serves static files globally (CDN)
   │
   └─▶ Render  ──▶  Runs Docker container ──▶  FastAPI on port 8000
                         │
                         ├─ Connects to PostgreSQL (Render managed DB)
                         └─ Connects to Cloudflare R2 (via env vars)
```

**Locally**, both services run via Docker Compose:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

---

## Security Highlights

- Passwords are **never stored in plain text** — only bcrypt hashes.
- JWT tokens expire after **24 hours**.
- Session tokens are stored in **httpOnly cookies** (invisible to JavaScript, safer against XSS attacks).
- A **60-second request timeout** cancels any hung AI or file-storage calls.
- **Rate limiting** prevents users from hammering AI endpoints.
- Unverified accounts are **auto-deleted** after 24 hours.

---

## Summary

| Concern | Solution |
|---------|---------|
| Frontend framework | React 19 + Vite + Tailwind CSS |
| Backend framework | FastAPI (Python) |
| Database | PostgreSQL (prod) / SQLite (local) via SQLAlchemy |
| File storage | Cloudflare R2 |
| Authentication | JWT + bcrypt + httpOnly cookies |
| AI features | OpenAI-compatible API (Groq / OpenAI / Ollama) |
| Email | Resend API |
| Frontend ↔ Backend | Axios HTTP client with auto-attached Bearer token |
| Migrations | Alembic |
| Rate limiting | SlowAPI |
| Deployment | Vercel (frontend) + Render (backend) |
