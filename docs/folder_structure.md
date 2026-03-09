# Folder Structure — JobAssist AI

Every folder in this project has a single clear responsibility. This document explains what lives in each folder, why it exists, and what it talks to.

---

## Top-level layout

```
job-application-assistant/
├── backend/          # Python API server (FastAPI)
├── frontend/         # React web app (Vite)
├── docs/             # Developer documentation (you are here)
├── docker-compose.yml
├── README.md
└── IMPLEMENTATION_PLAN.md
```

The project is split into two completely independent services — `backend/` and `frontend/` — that communicate only over HTTP. Neither one imports code from the other.

---

## `backend/`

**What it is:** The server-side application. Every piece of business logic, database access, AI calls, file uploads, and email sending happens here.

**Responsibility:** Expose a REST API on port 8000 that the frontend consumes. Guard all data behind authentication. Orchestrate calls to the database, Cloudflare R2, the LLM provider, and Resend.

**Interacts with:**
- `frontend/` — receives HTTP requests from it, sends JSON responses back
- PostgreSQL / SQLite database (external, via `app/database.py`)
- Cloudflare R2 (external, via `app/services/r2_service.py`)
- LLM provider — Groq / OpenAI (external, via `app/services/ai_service.py`)
- Resend email API (external, via `app/services/email_service.py`)

---

### `backend/alembic/`

**What it contains:** Database migration scripts managed by Alembic.

**Responsibility:** Track every change ever made to the database schema (adding a table, adding a column, etc.) as versioned, ordered scripts. This means the database can be upgraded or rolled back safely without losing data.

Key files:
| File | Purpose |
|------|---------|
| `env.py` | Tells Alembic how to connect to the database and discover models |
| `script.py.mako` | Template used to auto-generate new migration files |
| `versions/` | One Python file per migration, applied in order |

**Interacts with:**
- `backend/app/models.py` — reads the SQLAlchemy model definitions to detect schema changes
- The live database — applies SQL `ALTER TABLE`, `CREATE TABLE`, etc.

---

### `backend/alembic/versions/`

**What it contains:** Individual migration files, each representing one schema change.

**Responsibility:** Provide a reproducible history of database changes. Every file has an `upgrade()` function (apply the change) and a `downgrade()` function (undo it).

Current migrations (in order):
1. `a1644f362892` — Initial schema (all base tables)
2. `b2755g473903` — Added `drive_link` column to `resumes`
3. `c3866h584014` — Added `is_r2` column to `resumes`

**Interacts with:** Alembic runtime (`alembic/env.py`) and the database.

---

### `backend/app/`

**What it contains:** The entire FastAPI application — entry point, config, models, and all logic.

**Responsibility:** This is the heart of the backend. Everything the API does is defined or wired together here.

Key top-level files:
| File | Purpose |
|------|---------|
| `main.py` | Creates the FastAPI app, registers all routers, adds middleware (CORS, rate limiting, 60s timeout), and starts the background scheduler |
| `models.py` | Defines all database tables as Python classes (SQLAlchemy ORM models) |
| `schemas.py` | Defines the shape of request/response JSON using Pydantic — input validation and output serialization |
| `auth.py` | JWT token creation/verification and `get_current_user` dependency used by every protected route |
| `database.py` | Creates the SQLAlchemy engine and session factory; auto-detects SQLite vs PostgreSQL |
| `rate_limit.py` | Configures SlowAPI rate limiter instance shared across routers |
| `utils.py` | Small shared helper functions |

**Interacts with:** All sub-folders within `app/` — routers call services, services use models, models talk to the database.

---

### `backend/app/routers/`

**What it contains:** One file per feature area, each defining a set of API endpoints (routes).

**Responsibility:** Receive HTTP requests, validate inputs using schemas, authorize the user (via `auth.py`), call the appropriate service, and return a response. Routers are intentionally thin — they should not contain business logic.

| File | URL prefix | Feature area |
|------|------------|-------------|
| `auth_router.py` | `/api/auth` | Register, login, logout, token refresh |
| `auth_email_router.py` | `/api/auth` | Email verification, forgot/reset password |
| `profile_router.py` | `/api/profile` | Get and update user profile |
| `resume_router.py` | `/api/resume` | Upload, list, set default, delete resumes |
| `application_router.py` | `/api/applications` | Create, read, update, delete job applications |
| `ai_router.py` | `/api/ai` | Match scoring, JD analysis, answer generation, form autofill |

**Interacts with:**
- `app/auth.py` — every protected route uses `get_current_user`
- `app/services/` — delegates work to service layer
- `app/models.py` — queries the database through SQLAlchemy
- `app/schemas.py` — validates incoming JSON and shapes outgoing JSON

---

### `backend/app/services/`

**What it contains:** Business logic and integrations with external providers.

**Responsibility:** Do the actual work. Services are called by routers and contain all the complex logic and third-party API calls. Keeping this separate from routers makes the code easier to test and change.

| File | Responsibility |
|------|---------------|
| `ai_service.py` | Calls the LLM (Groq/OpenAI) to compute resume match scores, parse job descriptions, generate answers to job questions, and auto-map form fields to profile data |
| `autofill_service.py` | Fetches a job application form URL via HTTP, parses the HTML to detect form fields (supports Google Forms, Microsoft Forms, Typeform, JotForm, and generic forms), and generates a pre-filled URL |
| `r2_service.py` | Uploads, downloads, and deletes resume PDF files on Cloudflare R2 using the S3-compatible `boto3` SDK |
| `email_service.py` | Sends transactional emails (verification link, password reset link) via the Resend API and logs every send to the `email_logs` table |

**Interacts with:**
- `app/routers/` — called by routers
- `app/models.py` — reads/writes to the database (e.g., `EmailLog`)
- Cloudflare R2, LLM API, Resend — external HTTP calls

---

### `backend/app/data/`

**What it contains:** Local file storage used in development when Cloudflare R2 is not configured.

**Responsibility:** Provide a fallback location for uploaded resume PDFs on disk. In production, files go to R2 instead and this folder is not used.

**Interacts with:** `app/services/r2_service.py` and `app/routers/resume_router.py` — they check whether R2 is configured and fall back to writing here.

---

### `backend/data/`

**What it contains:** The SQLite database file (`app.db`) used in local development.

**Responsibility:** Act as a zero-configuration database when `DATABASE_URL` is not set in the environment. SQLAlchemy writes here automatically if no PostgreSQL URL is provided. In production this folder is unused — PostgreSQL is used instead.

**Interacts with:** `app/database.py`, which sets `DATABASE_URL = sqlite:///data/app.db` as a fallback.

---

## `frontend/`

**What it is:** The React web application served to the user's browser.

**Responsibility:** Render the UI, manage page navigation, handle user interactions, and communicate with the backend API over HTTP using Axios.

**Interacts with:**
- `backend/` — sends HTTP requests to `/api/*` endpoints, receives JSON

---

### `frontend/src/`

**What it contains:** All the React source code.

**Responsibility:** Everything the user sees and interacts with originates here.

Key top-level files:
| File | Purpose |
|------|---------|
| `main.jsx` | The entry point — mounts the React app into `index.html` |
| `App.jsx` | Defines all routes (which URL shows which page) and wraps the app in `AuthProvider` and `ErrorBoundary` |
| `api.js` | Central Axios instance — sets the base URL, attaches the JWT token to every request, and handles 401 redirects |
| `App.css` / `index.css` | Global CSS styles and CSS custom properties (design tokens like colours, spacing) |

---

### `frontend/src/pages/`

**What it contains:** One component per full page/screen of the app.

**Responsibility:** Compose smaller components into a complete view and wire up data fetching, form submission, and navigation for each feature.

| File | Page | Purpose |
|------|------|---------|
| `LoginPage.jsx` | `/login` | Email + password login form |
| `RegisterPage.jsx` | `/register` | Sign-up form |
| `VerifyEmailPage.jsx` | `/verify-email` | Handles the verification link click |
| `ForgotPasswordPage.jsx` | `/forgot-password` | Request a password reset email |
| `ResetPasswordPage.jsx` | `/reset-password` | Submit a new password using the reset token |
| `DashboardPage.jsx` | `/dashboard` | Overview stats and recent activity |
| `ProfilePage.jsx` | `/profile` | View and edit skills, experience, education |
| `ResumePage.jsx` | `/resume` | Upload, list, and manage PDF resumes |
| `AnalyzePage.jsx` | `/analyze` | Paste a JD and see your AI match score |
| `ApplicationsPage.jsx` | `/applications` | Track all job applications |
| `AutofillPage.jsx` | `/autofill` | Detect and fill job application forms |

**Interacts with:**
- `src/api.js` — all API calls go through here
- `src/components/` — uses shared UI components
- `src/context/AuthContext.jsx` — reads the logged-in user

---

### `frontend/src/components/`

**What it contains:** Reusable UI building blocks used across multiple pages.

**Responsibility:** Encapsulate pieces of UI that appear in more than one place so they don't have to be rewritten each time. Each component has one job.

| File | What it does |
|------|-------------|
| `Sidebar.jsx` | The navigation menu on the left side of every protected page |
| `ProtectedRoute.jsx` | Wraps a route — redirects to `/login` if the user is not authenticated |
| `ErrorBoundary.jsx` | Catches unexpected React errors and shows a friendly fallback instead of a blank screen |
| `ConfirmDialog.jsx` | A reusable "Are you sure?" modal dialog for destructive actions |
| `MatchScoreGauge.jsx` | A visual gauge that displays the AI resume match score (0–100) |
| `StatusBadge.jsx` | Coloured badge that shows an application status (Applied, Interview, Offer, etc.) |

**Interacts with:**
- `src/pages/` — pages import and render these components
- `src/context/AuthContext.jsx` — `ProtectedRoute` and `Sidebar` read auth state

---

### `frontend/src/components/ui/`

**What it contains:** Low-level, unstyled-to-lightly-styled primitive components.

**Responsibility:** Provide a consistent base set of HTML elements (button, card, input, label) with shared Tailwind styling so the rest of the app has a uniform look without repeating class names everywhere.

| File | What it wraps |
|------|--------------|
| `button.jsx` | `<button>` with variant styles (primary, outline, ghost, etc.) |
| `card.jsx` | A styled container box |
| `input.jsx` | `<input>` with consistent border and focus styles |
| `label.jsx` | `<label>` with consistent typography |

**Interacts with:** Every component and page that renders a form or card — they all import from here.

---

### `frontend/src/context/`

**What it contains:** React Context providers that share global state across the entire component tree.

**Responsibility:** Make data available to any component in the app without passing props through many layers ("prop drilling").

| File | What it manages |
|------|----------------|
| `AuthContext.jsx` | The logged-in user object, login/logout functions, and loading state. Any component can call `useAuth()` to read the current user or trigger a logout. |

**Interacts with:**
- `src/api.js` — calls the login/logout/me endpoints
- `src/components/ProtectedRoute.jsx` — reads `isAuthenticated`
- `src/components/Sidebar.jsx` — reads `user` to display name/avatar
- `src/pages/` — any page that needs to know who is logged in

---

### `frontend/src/lib/`

**What it contains:** Small utility functions that don't belong to any single component.

**Responsibility:** Keep shared helper logic in one place so it can be imported anywhere.

| File | What it does |
|------|-------------|
| `utils.js` | Contains `cn()` — a helper that merges Tailwind CSS class names cleanly (combining `clsx` and `tailwind-merge`) |

**Interacts with:** `src/components/ui/` and any component that builds dynamic class strings.

---

### `frontend/public/`

**What it contains:** Static files that are served directly without being processed by Vite.

**Responsibility:** Hold files that need a predictable public URL — things like `robots.txt` (tells search engine crawlers what to index) or favicon images.

| File | Purpose |
|------|---------|
| `robots.txt` | Instructs web crawlers (Google, etc.) on which pages to index |

**Interacts with:** No code imports from here — these files are accessed directly by browsers and bots at their URL.

---

### `frontend/src/assets/`

**What it contains:** Static assets (images, SVGs, fonts) that are imported directly into React components.

**Responsibility:** Store visual assets that are bundled by Vite. Unlike `public/`, files here get content-hash filenames (e.g., `logo.a1b2c3.svg`) for long-term browser caching.

**Interacts with:** Components that import images or SVGs directly in JSX.

---

## `docs/`

**What it contains:** Markdown documentation files written for developers.

**Responsibility:** Explain how the system is built, how data flows, what the API looks like, and how to extend the project. None of these files are loaded by the app at runtime — they exist purely for human readers.

| File | What it covers |
|------|---------------|
| `architecture.md` | Full system architecture — frameworks, auth, data storage, external services |
| `folder_structure.md` | This file — purpose of every folder |
| `api_structure.md` | Every API endpoint, its method, URL, inputs, and outputs |
| `database.md` | Database schema, table relationships, and column descriptions |
| `data_flow.md` | How data moves through the system for key user actions |
| `tech_stack.md` | Why each technology was chosen |
| `learning_path.md` | Suggested order for learning the codebase from scratch |

**Interacts with:** Nothing at runtime. Consumed by developers and contributors.

---

## Interaction Map

The diagram below shows how folders depend on each other at a high level:

```
frontend/src/pages/
        │
        ├── imports ──▶ frontend/src/components/
        │                       │
        │                       └── imports ──▶ frontend/src/components/ui/
        │
        ├── calls ────▶ frontend/src/api.js ──── HTTP ──▶ backend/app/routers/
        │                                                          │
        └── reads ────▶ frontend/src/context/             ┌───────┼────────────┐
                                                           ▼       ▼            ▼
                                                    app/auth.py  app/models.py  app/services/
                                                                      │                │
                                                                      ▼                ├──▶ Cloudflare R2
                                                                  Database             ├──▶ LLM API
                                                                (PostgreSQL            └──▶ Resend Email
                                                                / SQLite)
```

---

## Quick Reference

| Folder | One-line summary |
|--------|-----------------|
| `backend/` | The entire server — API, logic, database, integrations |
| `backend/alembic/` | Database migration history and runner |
| `backend/alembic/versions/` | One script per schema change, applied in order |
| `backend/app/` | FastAPI app, models, schemas, auth, config |
| `backend/app/routers/` | HTTP endpoints grouped by feature (auth, profile, resume, AI, etc.) |
| `backend/app/services/` | Business logic and external API integrations (AI, R2, email) |
| `backend/app/data/` | Local resume file fallback (dev only) |
| `backend/data/` | SQLite database file (dev only) |
| `frontend/` | The React web app served to the browser |
| `frontend/src/` | All React source code |
| `frontend/src/pages/` | Full-page components, one per route |
| `frontend/src/components/` | Reusable UI components |
| `frontend/src/components/ui/` | Low-level primitive elements (button, card, input) |
| `frontend/src/context/` | Global state (auth) via React Context |
| `frontend/src/lib/` | Shared utility functions |
| `frontend/public/` | Static files served at their raw URL (robots.txt, favicon) |
| `frontend/src/assets/` | Images/SVGs bundled by Vite |
| `docs/` | Developer documentation (no runtime impact) |
