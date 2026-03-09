# Tech Stack — JobAssist AI

This document explains every technology used in this project — what it does, why it was chosen, and exactly where it appears in the code.

---

## Map of the stack

```
┌─────────────────────── FRONTEND ────────────────────────────┐
│  React 19          — UI component framework                  │
│  Vite              — dev server + build tool                 │
│  React Router v7   — client-side page routing               │
│  Tailwind CSS v4   — utility-first styling                   │
│  Axios             — HTTP client for API calls              │
│  Lucide React      — icon library                            │
│  Sonner            — toast notifications                     │
└─────────────────────────────────────────────────────────────┘
                        │ HTTP / JSON
┌─────────────────────── BACKEND ─────────────────────────────┐
│  FastAPI           — Python web framework                    │
│  Uvicorn           — ASGI web server                         │
│  Pydantic v2       — request/response validation             │
│  SQLAlchemy v2     — database ORM                            │
│  Alembic           — database migrations                     │
│  python-jose       — JWT creation and verification           │
│  bcrypt            — password hashing                        │
│  PyPDF2            — PDF text extraction                     │
│  httpx             — async HTTP client (for form fetching)   │
│  boto3             — S3-compatible client for Cloudflare R2  │
│  openai SDK        — LLM API client (works with Groq too)   │
│  resend SDK        — transactional email                     │
│  APScheduler       — background task scheduler               │
│  SlowAPI           — rate limiting                           │
│  python-dotenv     — environment variable loading            │
└─────────────────────────────────────────────────────────────┘
                        │
┌─────────────────────── INFRASTRUCTURE ──────────────────────┐
│  PostgreSQL        — production relational database          │
│  Cloudflare R2     — object storage for resume PDFs         │
│  Groq / OpenAI     — LLM provider for AI features           │
│  Resend            — transactional email delivery            │
│  Vercel            — frontend hosting                        │
│  Render            — backend hosting (Docker container)      │
│  Docker / Compose  — local development environment          │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Technologies

### React 19
**What it does:** A JavaScript library for building user interfaces. Instead of manually updating HTML on every interaction, you declare what the UI should look like for a given state, and React handles all DOM updates.

**Why it's used:** React's component model lets each page and UI element (sidebar, badge, gauge, dialog) be an isolated, reusable piece. The `useState` / `useEffect` hooks manage local state and data fetching. React 19 brings performance improvements and better async rendering.

**Where it appears:**
- Every file in `frontend/src/pages/` — each page is a React function component
- Every file in `frontend/src/components/` — reusable pieces like `Sidebar.jsx`, `StatusBadge.jsx`, `MatchScoreGauge.jsx`
- `frontend/src/main.jsx` — mounts the root `<App />` component into the HTML page
- `frontend/src/context/AuthContext.jsx` — uses `createContext` + `useState` to share auth state globally

---

### Vite
**What it does:** A build tool and development server for frontend projects. In dev mode it serves files instantly using native ES modules (no bundling required). For production it bundles everything into optimized static files.

**Why it's used:** Vite is dramatically faster than older tools like Webpack/CRA. Hot Module Replacement (HMR) means the browser updates in milliseconds when you save a file — no full page reload.

**Where it appears:**
- `frontend/vite.config.js` — configures the dev server, proxies, and React plugin
- `frontend/package.json` — `dev`, `build`, and `preview` scripts all invoke Vite
- `frontend/index.html` — the single HTML file Vite uses as its entry point

---

### React Router v7
**What it does:** Handles client-side navigation — switching between pages (like `/dashboard` → `/profile`) without a full browser reload. The URL changes but only the relevant component re-renders.

**Why it's used:** JobAssist AI is a Single Page Application (SPA). Without a router the entire page would reload on every navigation, which is slow and loses component state. React Router also enables protected routes — wrapping pages so only authenticated users can access them.

**Where it appears:**
- `frontend/src/App.jsx` — defines all `<Route>` paths and wraps the tree with `<BrowserRouter>`
- `frontend/src/components/ProtectedRoute.jsx` — checks `isAuthenticated` and redirects to `/login` if false
- Every page that uses `useNavigate()` or `<Link>` for navigation

---

### Tailwind CSS v4
**What it does:** A utility-first CSS framework. Instead of writing custom CSS class names, you apply small single-purpose classes directly in JSX (e.g. `className="flex items-center gap-3 p-4 rounded-lg"`).

**Why it's used:** Tailwind eliminates the need to context-switch between JSX and separate CSS files. Styles live next to markup, making components self-contained. Tailwind v4 uses a CSS-based configuration (no `tailwind.config.js`), making it faster and simpler to set up.

**Where it appears:**
- Every `.jsx` file in `frontend/src/` — Tailwind classes in `className` props
- `frontend/src/index.css` — imports Tailwind and sets CSS custom properties (design tokens for colours)
- `frontend/vite.config.js` — uses `@tailwindcss/vite` plugin for zero-config integration

---

### Axios
**What it does:** A JavaScript HTTP client for making API requests from the browser. Wraps `fetch` with a cleaner API, automatic JSON serialization, and interceptors (hooks that run before every request or after every response).

**Why it's used:** The two interceptors in `api.js` do the work that would otherwise have to be repeated in every page:
1. **Request interceptor** — automatically attaches `Authorization: Bearer <token>` to every outgoing request
2. **Response interceptor** — catches `401 Unauthorized` responses globally and redirects to `/login`

**Where it appears:**
- `frontend/src/api.js` — the single configured Axios instance exported and used by every page
- Every page that calls `api.get(...)`, `api.post(...)`, `api.put(...)`, `api.delete(...)` imports from `api.js`

---

### Lucide React
**What it does:** A library of clean, consistent SVG icons as React components.

**Why it's used:** Icons improve UI clarity without adding custom SVG files. Lucide has a large set of icons and is tree-shakeable (only the icons you import are bundled).

**Where it appears:**
- `frontend/src/App.jsx` — `<Menu />` icon for the mobile sidebar toggle
- `frontend/src/components/Sidebar.jsx` — navigation icons for each sidebar link

---

### Sonner
**What it does:** A lightweight toast notification library for React. Shows brief, dismissible messages overlaid on the screen (success, error, info).

**Why it's used:** Toast notifications give instant feedback after actions like "Resume uploaded" or "Profile saved" without interrupting the user's flow or requiring a modal.

**Where it appears:**
- Referenced in pages that trigger user-facing success/error notifications after API calls

---

### class-variance-authority (CVA) + clsx + tailwind-merge
**What they do together:** Utilities for building components with dynamic, conditional Tailwind class strings.
- `clsx` — conditionally joins class name strings
- `tailwind-merge` — intelligently merges Tailwind classes and removes conflicts (e.g. prevents both `p-2` and `p-4` from applying)
- `cva` — defines variant-based component styles (e.g. a button with `variant="primary"` vs `variant="outline"`)

**Why they're used:** Without these tools, combining conditional Tailwind classes becomes messy string concatenation that breaks easily. These three packages are the standard pattern for building design systems with Tailwind.

**Where they appear:**
- `frontend/src/lib/utils.js` — exports the `cn()` helper (wraps `clsx` + `tailwind-merge`)
- `frontend/src/components/ui/button.jsx` — uses CVA to define button variants
- Throughout components that use `cn()` for conditional class names

---

## Backend Technologies

### FastAPI
**What it does:** A modern Python web framework for building HTTP APIs. You define endpoints by writing plain Python functions decorated with `@router.get(...)` or `@router.post(...)`. FastAPI automatically generates OpenAPI (Swagger) documentation, validates request bodies using Pydantic, and handles async I/O efficiently.

**Why it's used:** FastAPI is one of the fastest Python frameworks (comparable to NodeJS and Go in benchmarks). Its deep integration with Pydantic means all input validation and output serialization happen automatically with zero boilerplate. The dependency injection system (`Depends(get_current_user)`) makes auth reusable across every endpoint with one line.

**Where it appears:**
- `backend/app/main.py` — creates the `FastAPI()` app instance, registers all routers, adds middleware
- `backend/app/routers/` — every router file uses `APIRouter` and route decorators
- All endpoint functions use FastAPI's `Depends()` for injecting the DB session and current user

---

### Uvicorn
**What it does:** An ASGI (Asynchronous Server Gateway Interface) web server. It is the process that actually listens on port 8000 and hands incoming HTTP requests to FastAPI.

**Why it's used:** FastAPI is an async framework and needs an ASGI-compatible server. Uvicorn is the standard choice — it's fast, lightweight, and works seamlessly with FastAPI.

**Where it appears:**
- `backend/Dockerfile` — the `CMD` runs `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- `backend/runtime.txt` — specifies the Python version for the Uvicorn runtime on Render

---

### Pydantic v2
**What it does:** A data validation library. You define the shape of data using Python classes with typed fields. Pydantic automatically validates that incoming JSON matches the expected shape and types, and raises descriptive errors if not.

**Why it's used:** Every API endpoint's request body and response is defined as a Pydantic model. This provides:
- Automatic input validation (wrong type → 422 error with a clear message)
- Automatic output serialization (Python objects → JSON)
- A single source of truth for what data looks like, readable as Python code
- Built-in field sanitization (the `@field_validator` hooks strip dangerous characters)

**Where it appears:**
- `backend/app/schemas.py` — all request/response models (`UserCreate`, `LoginRequest`, `ApplicationOut`, `MatchResponse`, etc.)
- Every router uses these schemas as type hints: `payload: ApplicationCreate`

---

### SQLAlchemy v2
**What it does:** An ORM (Object-Relational Mapper). Lets you work with the database using Python classes and objects instead of writing raw SQL strings. A Python class represents a table; an instance of that class represents a row.

**Why it's used:** SQLAlchemy abstracts over different databases (works with both PostgreSQL and SQLite) so the same code runs in production and local dev. It also handles connection pooling, transactions, and relationship loading automatically. SQLAlchemy v2 adds improved typing and a cleaner query API.

**Where it appears:**
- `backend/app/models.py` — all database table definitions (`User`, `Profile`, `Resume`, `Application`, `QAPair`, `EmailLog`)
- `backend/app/database.py` — creates the `engine` and `SessionLocal` factory; defines the `get_db()` dependency
- Every router injects a `Session` via `db: Session = Depends(get_db)` and uses it for queries

---

### Alembic
**What it does:** A database migration tool that works alongside SQLAlchemy. Tracks every schema change as a versioned Python script. Allows the database to be evolved safely (adding columns, creating tables) without losing existing data.

**Why it's used:** Without migrations, schema changes would require dangerous manual SQL or dropping and recreating the entire database. Alembic provides an ordered, reproducible history of every schema change that can be applied to any environment.

**Where it appears:**
- `backend/alembic/` — migration runner configuration
- `backend/alembic/versions/` — three migration scripts (initial schema, `drive_link` column, `is_r2` column)
- `backend/alembic.ini` — connection string and logging settings for Alembic

---

### python-jose
**What it does:** A Python library for creating and verifying JSON Web Tokens (JWTs). A JWT is a signed string that carries a payload (like `user_id`) and proves it hasn't been tampered with.

**Why it's used:** JWTs are the standard stateless authentication mechanism for REST APIs. The server creates a JWT on login using a secret key. On subsequent requests the client sends the token; the server verifies the signature to trust the payload — no database lookup required to validate the token itself.

**Where it appears:**
- `backend/app/auth.py` — `jwt.encode()` in `create_access_token()`; `jwt.decode()` in `get_current_user()`

---

### bcrypt
**What it does:** A password hashing algorithm. Converts a plain-text password into an irreversible scrambled string (the hash). Includes a random salt per hash to prevent rainbow table attacks, and a configurable cost factor that makes brute-force attacks slow.

**Why it's used:** Passwords must never be stored in plain text. If the database were ever compromised, bcrypt hashes are computationally infeasible to reverse. bcrypt is the industry standard — it's slow by design, which is exactly what you want for password storage.

**Where it appears:**
- `backend/app/auth.py` — `hash_password()` wraps `bcrypt.hashpw()`; `verify_password()` wraps `bcrypt.checkpw()`
- Used in `POST /api/auth/register` (hash on signup) and `POST /api/auth/login` (verify on login) and `POST /api/auth/reset-password` (hash new password)

---

### PyPDF2
**What it does:** A pure-Python library for reading PDF files. Extracts the text content from each page of a PDF document.

**Why it's used:** Resume PDFs need to be readable by the LLM for match scoring, answer generation, and JD analysis. PyPDF2 extracts the text in-memory (no temp files) so it can be included in the LLM prompt.

**Where it appears:**
- `backend/app/routers/ai_router.py` — `_get_default_resume_text()` uses `PdfReader` to iterate pages and extract text
- Text is capped at 3,000 characters before being sent to the LLM to stay within token limits

---

### httpx
**What it does:** An async-capable Python HTTP client, similar to the popular `requests` library but with support for `async`/`await`.

**Why it's used:** The autofill service needs to fetch the HTML of job application form URLs. httpx is used instead of `requests` because the route handler is async (`async def`) and `requests` would block the event loop. httpx also follows redirects automatically and is more standards-compliant.

**Where it appears:**
- `backend/app/services/autofill_service.py` — `async with httpx.AsyncClient() as client: resp = await client.get(url)`

---

### boto3
**What it does:** Amazon Web Services' official Python SDK. Although it's designed for AWS, it uses the S3 API — which Cloudflare R2 is 100% compatible with. boto3 handles signing requests, uploading bytes, downloading bytes, and deleting objects.

**Why it's used:** Cloudflare R2 exposes an S3-compatible API, so boto3 works without any changes. Resume PDF files are stored in R2 (not in the database) because object storage is cheap, fast, and built for large binary files. Storing PDFs in a relational database would bloat it and slow down all unrelated queries.

**Where it appears:**
- `backend/app/services/r2_service.py` — `_get_client()` builds a boto3 S3 client pointed at the R2 endpoint; `upload_file()`, `download_file()`, `delete_file()` use it

---

### openai (Python SDK)
**What it does:** OpenAI's official Python SDK for calling LLM chat completion APIs. Sends a system prompt + user prompt and receives a generated text response.

**Why it's used:** The SDK supports any OpenAI-compatible endpoint — not just OpenAI itself. By configuring `base_url` and `api_key` via environment variables, the same code works with **Groq** (fast open-source model inference), **OpenAI** (GPT-4 etc.), or a **local Ollama** instance. This flexibility means you can switch providers without changing code.

**Where it appears:**
- `backend/app/services/ai_service.py` — `_get_llm_client()` instantiates `OpenAI(api_key=..., base_url=...)` once and caches it; `_llm_call()` calls `client.chat.completions.create()`
- Controlled by three environment variables: `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL`

---

### resend (Python SDK)
**What it does:** A Python SDK for the Resend transactional email API. Sends HTML + plain-text emails to any address.

**Why it's used:** Sending email reliably requires proper authentication (SPF, DKIM, DMARC) and good deliverability infrastructure. Resend handles all of that. The SDK is simple — one function call with `from`, `to`, `subject`, `html` is all it takes. Every send is logged to `email_logs` for debugging.

**Where it appears:**
- `backend/app/services/email_service.py` — `_send_email()` imports `resend`, sets `resend.api_key`, and calls `resend.Emails.send(params)`
- Used to send verification emails and password reset emails

---

### APScheduler
**What it does:** A background task scheduler for Python. Runs functions on a timer (e.g. "run this function every 24 hours") inside the same process as the web server, without needing a separate worker.

**Why it's used:** Unverified user accounts (where the user registered but never clicked the email link) need to be cleaned up periodically to keep the database tidy and prevent email address squatting. APScheduler runs this cleanup job every 24 hours automatically using the `BackgroundScheduler`.

**Where it appears:**
- `backend/app/main.py` — scheduler is started inside the `lifespan()` context manager (runs on app startup, shuts down on app exit); calls `_cleanup_unverified_users()` every 24 hours

---

### SlowAPI
**What it does:** A rate-limiting library for FastAPI/Starlette. Limits how many requests a single client (by IP address) can make to an endpoint within a time window.

**Why it's used:** Without rate limiting, a malicious user could:
- Flood the registration endpoint to scrape whether emails are registered
- Hammer AI endpoints (which cost money per LLM call)
- Trigger thousands of emails to spam victims

SlowAPI is a FastAPI-compatible port of Flask-Limiter.

**Where it appears:**
- `backend/app/rate_limit.py` — creates the shared `limiter = Limiter(key_func=get_remote_address)` instance
- `backend/app/main.py` — registers the limiter and the `RateLimitExceeded` error handler
- `backend/app/routers/auth_router.py` — `@limiter.limit("3/minute")` on register, `@limiter.limit("5/minute")` on login
- `backend/app/routers/auth_email_router.py` — `@limiter.limit("3/15minutes")` on send-verification and forgot-password

---

### python-dotenv
**What it does:** Loads environment variables from a `.env` file into `os.environ` at startup, so the app's configuration (API keys, database URL, secret key) doesn't have to be hard-coded and isn't committed to version control.

**Why it's used:** Secrets (API keys, database passwords) must never be stored in source code. `python-dotenv` lets you keep them in a `.env` file locally, while in production they are set directly as environment variables on the hosting platform (Render).

**Where it appears:**
- `backend/app/database.py` — `load_dotenv()` is called at module import time to populate `DATABASE_URL`
- All services read their keys via `os.getenv("R2_ACCESS_KEY_ID")`, `os.getenv("LLM_API_KEY")`, etc.

---

## Infrastructure & External Services

### PostgreSQL
**What it does:** A powerful open-source relational database. Stores all structured application data in tables with rows and columns, supporting transactions, indexes, and foreign key constraints.

**Why it's used:** The application's data (users, profiles, applications, resumes metadata) is relational — users own profiles, profiles own skills, etc. PostgreSQL handles concurrent connections, enforces data integrity, and scales well. It's the default choice for production Python web applications.

**Where it appears:**
- `backend/app/database.py` — `DATABASE_URL` is parsed; `postgresql://` is rewritten to use the `psycopg` v3 driver (`postgresql+psycopg://`)
- Configured via the `DATABASE_URL` environment variable on Render (or in `.env` locally)
- SQLite is used automatically in dev if `DATABASE_URL` is not set

---

### Cloudflare R2
**What it does:** Object storage — a service for storing and retrieving files (blobs) by a unique key. The API is identical to Amazon S3, so any S3-compatible tool works with it. Files in R2 are private by default.

**Why it's used:** Resume PDFs are large binary files that don't belong in a relational database. R2 provides cheap, durable, globally distributed blob storage with zero egress fees (you don't pay to download). Files are stored with a UUID-prefixed key to prevent collisions and are never publicly accessible — downloads go through the authenticated backend.

**Where it appears:**
- `backend/app/services/r2_service.py` — all R2 operations (upload, download, delete)
- Configured via `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET` env vars
- Used by `resume_router.py` (upload/download/delete) and `ai_router.py` (download for text extraction)

---

### Groq / OpenAI (LLM Provider)
**What it does:** Provides a hosted Large Language Model (LLM) accessible via HTTP API. The LLM takes a text prompt and generates a text response — used here for resume analysis, skill matching, answer generation, and JD parsing.

**Why Groq specifically:** Groq runs open-source models (like Llama 3) on custom hardware (LPUs) that are significantly faster than GPU inference. For a user-facing product, low latency matters — Groq responses arrive in 1–3 seconds vs 5–15 seconds for other providers.

**Why both providers are supported:** The app uses the OpenAI SDK with a configurable `base_url`. Pointing it at `https://api.groq.com/openai/v1` makes it work with Groq. Pointing it at `https://api.openai.com/v1` makes it work with OpenAI. A local Ollama server can also be used with `http://localhost:11434/v1`.

**Where it appears:**
- `backend/app/services/ai_service.py` — all LLM calls go through `_llm_call()` which uses the `OpenAI` SDK client
- Configured via `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL` env vars

---

### Resend
**What it does:** A developer-focused transactional email API. Handles email delivery, authentication headers (SPF/DKIM), and provides a dashboard for monitoring deliverability.

**Why it's used:** Sending email from a raw SMTP server is unreliable — emails land in spam, IP reputation matters, and authentication is complex to set up. Resend abstracts all of this. The free tier is enough for a small-scale application and the API is simple to use.

**Where it appears:**
- `backend/app/services/email_service.py` — `resend.Emails.send(params)` sends verification and password reset emails
- Configured via `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` env vars

---

### Vercel
**What it does:** A cloud platform for hosting frontend web applications. Detects the framework (Vite/React), runs the build command, and deploys the output as a globally distributed CDN.

**Why it's used:** Vercel is the fastest way to get a React app deployed. It handles HTTPS, global CDN distribution, automatic deploys from Git, and preview deployments for pull requests — all for free on the hobby tier.

**Where it appears:**
- `frontend/vercel.json` — configures SPA routing (all paths fallback to `index.html`) so React Router handles navigation server-side
- `frontend/.env` / Vercel dashboard — `VITE_API_URL` is set to the Render backend URL

---

### Render
**What it does:** A cloud platform for hosting backend services. Runs the FastAPI backend as a Docker container, manages environment variables, and provides a managed PostgreSQL database.

**Why it's used:** Render supports Docker deployments natively, has a generous free tier, and integrates with GitHub for automatic deploys. Its managed PostgreSQL removes the need to operate a database yourself.

**Where it appears:**
- `backend/Dockerfile` — defines the container image that Render builds and runs
- Environment variables (`DATABASE_URL`, `SECRET_KEY`, `LLM_API_KEY`, etc.) are set in the Render dashboard

---

### Docker & Docker Compose
**What it does:** Docker packages the application and all its dependencies into a portable container — the same image runs identically on any machine. Docker Compose orchestrates multiple containers (frontend + backend) as a single local development environment.

**Why it's used:** "It works on my machine" is eliminated. Any developer can run the full stack with `docker compose up` regardless of their OS or installed software. The backend and frontend containers have their ports exposed and auto-reload in dev mode.

**Where it appears:**
- `docker-compose.yml` — defines two services: `backend` (port 8000) and `frontend` (port 5173), with a shared volume for the SQLite data directory
- `backend/Dockerfile` — installs Python dependencies and sets the Uvicorn start command
- `frontend/Dockerfile` — installs Node.js dependencies and starts the Vite dev server

---

## Quick Reference Table

| Technology | Category | Role |
|-----------|----------|------|
| React 19 | Frontend | UI component framework |
| Vite | Frontend | Dev server and build tool |
| React Router v7 | Frontend | Client-side page routing |
| Tailwind CSS v4 | Frontend | Utility-first CSS styling |
| Axios | Frontend | HTTP client + auth interceptors |
| Lucide React | Frontend | SVG icon components |
| Sonner | Frontend | Toast notifications |
| CVA + clsx + tailwind-merge | Frontend | Dynamic CSS class composition |
| FastAPI | Backend | HTTP API framework |
| Uvicorn | Backend | ASGI web server |
| Pydantic v2 | Backend | Request/response validation |
| SQLAlchemy v2 | Backend | Database ORM |
| Alembic | Backend | Database migrations |
| python-jose | Backend | JWT creation and verification |
| bcrypt | Backend | Password hashing |
| PyPDF2 | Backend | PDF text extraction |
| httpx | Backend | Async HTTP client (form fetching) |
| boto3 | Backend | Cloudflare R2 (S3-compatible) client |
| openai SDK | Backend | LLM API client |
| resend SDK | Backend | Transactional email |
| APScheduler | Backend | Background job scheduler |
| SlowAPI | Backend | Rate limiting |
| python-dotenv | Backend | `.env` file loading |
| PostgreSQL | Database | Production relational database |
| Cloudflare R2 | Storage | Resume PDF object storage |
| Groq / OpenAI | AI | LLM inference provider |
| Resend | Email | Email delivery infrastructure |
| Vercel | Hosting | Frontend CDN + deployment |
| Render | Hosting | Backend container + managed DB |
| Docker / Compose | DevOps | Containerization + local dev |
