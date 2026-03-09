# Learning Path — JobAssist AI

A guided reading order for understanding this codebase from scratch. Start at Step 1 even if you are an experienced developer — each step builds on the last and skipping ahead will make later files harder to understand.

Each step lists the exact files to read, what to look for, and what you should understand before moving on.

---

## Before you start — read the docs first

Read these four documents in order. They give you the mental model you need before looking at any code.

| Order | File | What you will learn |
|-------|------|---------------------|
| 1 | `docs/architecture.md` | The big picture — what the app is, how the pieces connect |
| 2 | `docs/folder_structure.md` | What every folder's job is |
| 3 | `docs/database.md` | What data exists and how it is organised |
| 4 | `docs/api_structure.md` | What every API endpoint does |

After reading these you should be able to answer:
- Where does the frontend code live?
- Where does the backend code live?
- What tables are in the database?
- What does `POST /api/auth/login` do?

---

## Step 1 — The database models (start here for backend)

**File:** `backend/app/models.py`  
**Difficulty:** Beginner  
**Time:** 10–15 minutes

This is the single most important file to read first. Every feature in the backend ultimately reads from or writes to the tables defined here.

**What to look for:**
- Each Python class is one database table
- `Column(...)` defines one column — note the type, whether it's nullable, and the default value
- `relationship(...)` lines define how tables connect to each other
- `ForeignKey("users.id")` means "this column points to a row in the users table"
- `cascade="all, delete-orphan"` means child rows are deleted automatically when the parent is deleted

**What you should understand after:**
- There are 6 tables: `users`, `profiles`, `resumes`, `applications`, `qa_pairs`, `email_logs`
- Everything hangs off `users` — every other table has a `user_id` foreign key
- `profiles` is one-to-one with `users`; the rest are one-to-many
- `resumes` stores metadata only — the actual PDF file lives in Cloudflare R2

---

## Step 2 — The database connection

**File:** `backend/app/database.py`  
**Difficulty:** Beginner  
**Time:** 5 minutes

A short file that shows how the app connects to the database.

**What to look for:**
- `DATABASE_URL` is read from an environment variable
- If it's absent, the app falls back to SQLite (a local file — zero config needed for dev)
- `engine` is the low-level database connection
- `SessionLocal` is a factory that creates database sessions (one per request)
- `get_db()` is a generator function used as a FastAPI dependency — it opens a session, yields it to the route handler, then closes it

**What you should understand after:**
- How the app supports both PostgreSQL (production) and SQLite (dev) with the same code
- What `get_db()` is and why it exists — it will appear in every single route handler

---

## Step 3 — The Pydantic schemas

**File:** `backend/app/schemas.py`  
**Difficulty:** Beginner–Intermediate  
**Time:** 15–20 minutes

Read this alongside `models.py`. Schemas define the shape of the JSON that enters and leaves the API. Models define the shape of rows in the database.

**What to look for:**
- Classes that end in `Create` or `Request` — these validate incoming data from the frontend
- Classes that end in `Out` or `Response` — these define the JSON shape sent back to the client
- `Optional[...]` fields — these can be omitted in a request
- `@field_validator` methods — these sanitize or validate a field after it is parsed
- `class Config: from_attributes = True` — tells Pydantic it can read values from SQLAlchemy model objects directly

**What you should understand after:**
- The difference between a schema and a model (schema = JSON contract; model = database table)
- Why both exist: you never expose raw database rows directly to the client

---

## Step 4 — Authentication

**File:** `backend/app/auth.py`  
**Difficulty:** Intermediate  
**Time:** 15 minutes

This file is the backbone of security. Everything in the backend that requires a logged-in user calls into this file.

**What to look for:**
- `hash_password()` — uses bcrypt to turn a plain password into an irreversible hash
- `verify_password()` — uses bcrypt to check if a submitted password matches a stored hash
- `create_access_token()` — creates a JWT signed with `SECRET_KEY`, with a 24-hour expiry
- `get_current_user()` — the FastAPI dependency that reads the JWT (from cookie or header), decodes it, and returns the `User` object. This runs on every protected request.

**What you should understand after:**
- Passwords are never stored as plain text — only bcrypt hashes
- A JWT is a signed token that proves who you are without a database lookup for each request
- `get_current_user` is injected into every protected route via `current_user: User = Depends(get_current_user)`

---

## Step 5 — The simplest router: Applications

**File:** `backend/app/routers/application_router.py`  
**Difficulty:** Intermediate  
**Time:** 15 minutes

This is the shortest and simplest router. It has no external service calls — just clean database CRUD. Read this before the other routers.

**What to look for:**
- The four route decorators: `@router.get`, `@router.post`, `@router.put`, `@router.delete`
- Every route has `current_user: User = Depends(get_current_user)` — this is how auth is enforced
- Every route has `db: Session = Depends(get_db)` — this is the database session
- The `list_applications` endpoint accepts an optional `?status=` query parameter and filters the `db.query(...)` accordingly
- Every query filters by `user_id == current_user.id` — users can only ever see their own data

**What you should understand after:**
- The anatomy of a FastAPI route: decorator → function → dependencies → query → return
- How `Depends(get_current_user)` gate-keeps a route for authenticated users only
- How optional query parameters work in FastAPI

---

## Step 6 — The auth router (register + login)

**Files:** `backend/app/routers/auth_router.py`, `backend/app/routers/auth_email_router.py`  
**Difficulty:** Intermediate  
**Time:** 20–25 minutes

Read these together — they cover the full identity lifecycle.

**What to look for in `auth_router.py`:**
- `register` — creates a user + profile, sends a verification email, handles the "already registered but unverified" edge case
- `login` — verifies password + `is_verified`, creates JWT, sets it as both an httpOnly cookie AND returns it in the response body
- `logout` — deletes the cookie
- `me` — decodes the token and returns the user's info

**What to look for in `auth_email_router.py`:**
- `send_verification` — resends the verification email; returns a generic message even if email not found (prevents attackers from checking whether an email is registered)
- `verify_email` — receives the token from the URL, marks `is_verified = True`, clears the token
- `forgot_password` + `reset_password` — the two-step password reset flow

**What you should understand after:**
- Why the response always says "if this email is registered, a link will be sent" (prevents email enumeration)
- Why the JWT is set as an httpOnly cookie (JavaScript can't read it — protects against XSS) AND returned in the body (needed for cross-domain auth where cookies may not be sent)
- How one-time tokens work: generated → stored in DB → consumed on use → cleared

---

## Step 7 — The profile and resume routers

**Files:** `backend/app/routers/profile_router.py`, `backend/app/routers/resume_router.py`  
**Difficulty:** Intermediate  
**Time:** 20 minutes

**Profile router** — straightforward. Read it to understand:
- How `PUT` with `exclude_unset=True` works — only fields the client actually sent are updated, others stay unchanged
- How `qa_pairs` (saved answers) are managed: get, update, delete

**Resume router** — more complex because it involves file storage. Read it to understand:
- `upload_resume` — validates the file (PDF only, ≤ 10 MB), generates a UUID key, calls `r2_service.upload_file()`, then inserts a `Resume` row with `is_r2=True`
- `download_resume` — streams bytes back from R2 using `StreamingResponse`; the `?mode=view` vs `?mode=download` param controls whether the browser opens the file inline or saves it
- `set_default_resume` — first sets `is_default=False` on ALL the user's resumes, then sets `True` on the target one
- `delete_resume` — deletes the R2 file first, then the DB row. Note: R2 failure is logged but doesn't block DB deletion

**What you should understand after:**
- Why the file is stored in R2 but a metadata row is inserted in the DB
- What `is_r2=True` means (filepath is an R2 key, not a local path)
- How file streaming works in FastAPI (`StreamingResponse` for in-memory bytes, `FileResponse` for local files)

---

## Step 8 — The R2 storage service

**File:** `backend/app/services/r2_service.py`  
**Difficulty:** Intermediate  
**Time:** 10 minutes

A focused service file with no dependencies on FastAPI — pure storage logic.

**What to look for:**
- `_get_client()` — builds a boto3 S3 client pointed at the Cloudflare R2 endpoint using env vars
- `is_r2_configured()` — checks that all three required env vars are present
- `upload_file()` — calls `client.put_object(...)`, returns the R2 key
- `download_file()` — calls `client.get_object(...)`, reads and returns raw bytes
- `delete_file()` — calls `client.delete_object(...)`, silently ignores "not found" errors

**What you should understand after:**
- R2 uses the exact same API as Amazon S3 — boto3 doesn't know or care it's talking to Cloudflare
- The "key" is like a file path: `resumes/abc123_resume.pdf`
- Files in R2 are private — users can only access them through the authenticated download endpoint

---

## Step 9 — The email service

**File:** `backend/app/services/email_service.py`  
**Difficulty:** Intermediate  
**Time:** 10 minutes

**What to look for:**
- `_send_email()` — the core function: sets `resend.api_key`, calls `resend.Emails.send()`, logs the result to `email_logs` regardless of success or failure
- `send_verification_email()` and `send_password_reset_email()` — call `_send_email()` with pre-built HTML templates
- The dev-mode fallback — if Resend is not configured (no API key), the function returns the verification link directly in the response body so you can test without a real email

**What you should understand after:**
- Every email send attempt (success or failure) is written to `email_logs` — this is your debugging trail
- HTML emails have a plain-text fallback (`text` field) — required for good spam scoring
- The dev fallback means you never need a real email provider to develop locally

---

## Step 10 — The AI service

**File:** `backend/app/services/ai_service.py`  
**Difficulty:** Intermediate–Advanced  
**Time:** 25–30 minutes

This is the largest service file. Read it carefully — it contains all the prompt engineering.

**What to look for:**
- `_get_llm_client()` — creates (and caches) an `OpenAI` SDK client pointed at the configured `LLM_API_URL`. The same client works for Groq, OpenAI, or Ollama with different env vars.
- `_llm_call()` — the single function all AI features funnel through. Sends a system prompt + user prompt, returns the response text. Has a 30-second timeout.
- `_extract_json()` — parses JSON from LLM responses. The LLM often wraps JSON in markdown code fences (` ```json ... ``` `); this function strips those before parsing.
- `compute_match_score()` — builds a detailed prompt combining the user's skills, summary, resume text, and the job description. Asks the LLM to return a structured JSON object with scores, matched/missing skills, suggestions.
- `generate_answer()` — given a question and context (profile + resume + JD), prompts the LLM to write a concise first-person answer.
- `parse_job_description()` — extracts structured data from raw JD text (title, required skills, experience level, responsibilities).
- `auto_map_fields()` — the most complex function: given a list of form field labels and all the user's profile data + saved answers, asks the LLM to map each label to the best matching value.

**What you should understand after:**
- Every AI feature has a fallback for when `LLM_API_KEY` is not set (returns empty/default values)
- The LLM is asked to return JSON — `_extract_json()` makes this reliable by handling formatting noise
- Caching the LLM client (`_llm_client_instance`) prevents creating a new HTTP connection pool on every request

---

## Step 11 — The AI router

**File:** `backend/app/routers/ai_router.py`  
**Difficulty:** Advanced  
**Time:** 20 minutes

Now that you understand the service, read the router that exposes it as HTTP endpoints.

**What to look for:**
- `_get_default_resume_text()` — the helper used by every AI endpoint. Finds the user's default resume, downloads it from R2 (or reads it locally), extracts text with PyPDF2, truncates to 3000 chars.
- How each route gathers data (profile + resume text), calls the service, and validates the response through a Pydantic schema before returning it
- `auto_map` — the most complex route: loads profile, loads all `QAPair` rows (saved answers), loads the default resume's `drive_link`, then passes everything to `auto_map_fields()`

**What you should understand after:**
- The pattern every AI route follows: authenticate → load profile → load resume text → call service → return
- Why resume text is capped at 3000 characters (LLM token limits; sending the full document would be expensive and slow)

---

## Step 12 — The autofill service

**File:** `backend/app/services/autofill_service.py`  
**Difficulty:** Advanced  
**Time:** 20 minutes

**What to look for:**
- `_detect_platform()` — uses simple URL substring matching to identify the form provider (Google Forms, Microsoft Forms, Typeform, JotForm, or generic)
- `detect_fields()` — fetches the page HTML with `httpx`, calls the right parser based on platform
- `_parse_google_forms()`, `_parse_ms_forms()`, `_parse_generic_form()` — each uses different HTML parsing logic because every platform structures its forms differently
- `fill_form()` — takes the `field_map` (field_id → value) and builds the pre-fill URL. For Google Forms this is a query string: `?entry.12345=Alice+Smith&...`

**What you should understand after:**
- No browser automation (no Playwright/Selenium) — just raw HTTP + HTML parsing. This is faster but works less reliably on JavaScript-heavy forms.
- Why each platform needs its own parser — the HTML structure is completely different

---

## Step 13 — The main app entry point

**File:** `backend/app/main.py`  
**Difficulty:** Intermediate  
**Time:** 15 minutes

Read this last for the backend — it wires everything together.

**What to look for:**
- `lifespan()` — an async context manager that runs setup code (start scheduler) on app startup and teardown code (stop scheduler) on shutdown
- CORS middleware — allows the frontend (on a different domain) to make requests to the backend. The allowed origins are configured as an env var.
- `_TimeoutMiddleware` — wraps every request in a 60-second `asyncio.wait_for()` — if a route hangs (e.g. LLM call never returns), it is cancelled and a 504 is returned
- Rate limiter setup — `SlowAPI` is attached to the app and the `RateLimitExceeded` handler is registered
- `app.include_router(...)` — each router is registered here, which is how their endpoints become reachable

**What you should understand after:**
- The order things happen on startup: lifespan starts → scheduler starts → app accepts requests
- Why CORS is needed (frontend and backend are on different domains in production)
- How middleware works: it wraps every request before and after the route handler runs

---

## Step 14 — The frontend API client

**File:** `frontend/src/api.js`  
**Difficulty:** Beginner  
**Time:** 5 minutes

The shortest file in the frontend. Read it before any page component.

**What to look for:**
- `axios.create({baseURL, withCredentials: true})` — creates a pre-configured Axios instance. `withCredentials` allows cookies to be sent on cross-domain requests.
- The request interceptor — adds `Authorization: Bearer <token>` to every outgoing request automatically
- The response interceptor — catches `401` responses globally, clears the token from `localStorage`, redirects to `/login`
- `getErrorMessage()` — a helper that extracts a human-readable error string from an Axios error

**What you should understand after:**
- All frontend API calls use this one configured instance, never raw `axios` or `fetch`
- Auth is handled once here — no page component needs to manually attach the token

---

## Step 15 — The auth context

**File:** `frontend/src/context/AuthContext.jsx`  
**Difficulty:** Intermediate  
**Time:** 10–15 minutes

**What to look for:**
- `createContext()` — creates a context object that any component can subscribe to
- `AuthProvider` — the component that wraps the whole app and provides `user`, `isAuthenticated`, `login()`, `logout()` to all children
- `login()` — stores the token in `localStorage`, stores the user in state, navigates to `/dashboard`
- `logout()` — calls `POST /api/auth/logout`, clears `localStorage`, resets state, navigates to `/login`
- The `useEffect` on mount — calls `GET /api/auth/me` to restore session from a stored token if the user refreshes the page

**What you should understand after:**
- `useAuth()` is the hook any component calls to get the current user or trigger login/logout
- The context is the single source of truth for "is anyone logged in?"

---

## Step 16 — App routing and layout

**File:** `frontend/src/App.jsx`  
**Difficulty:** Beginner  
**Time:** 10 minutes

**What to look for:**
- Public routes (login, register, verify-email, etc.) — no `<ProtectedRoute>` wrapper, accessible to anyone
- Protected routes — wrapped in `<ProtectedRoute><AppLayout>...</AppLayout></ProtectedRoute>`
- `AppLayout` — the component that renders the `<Sidebar>` and the `<main>` content area side by side
- The mobile header — a hamburger menu shown on small screens that opens the sidebar as an overlay

**What you should understand after:**
- Every protected page is automatically guarded — if you're not logged in you get redirected to `/login`
- `AppLayout` gives every protected page the same sidebar + main content structure

---

## Step 17 — A simple page component

**File:** `frontend/src/pages/ApplicationsPage.jsx`  
**Difficulty:** Intermediate  
**Time:** 15 minutes

Read a simple page before the complex AI pages.

**What to look for:**
- `useEffect(() => { api.get('/api/applications') }, [])` — fetches data when the component mounts
- `useState` for the applications list, loading state, and error state
- How the list is rendered: `.map()` over the data, render a card per item
- CRUD operations: create (POST), update (PUT), delete (DELETE) and how the local state is updated after each

**What you should understand after:**
- The standard pattern every data-fetching page follows: `useState` + `useEffect` + `api.get()`
- After a mutation (create/update/delete), the local state is updated directly rather than re-fetching the whole list

---

## Step 18 — The AI feature pages

**Files:** `frontend/src/pages/AnalyzePage.jsx`, `frontend/src/pages/AutofillPage.jsx`  
**Difficulty:** Advanced  
**Time:** 20–25 minutes

**What to look for in `AnalyzePage.jsx`:**
- The textarea for pasting the job description
- `POST /api/ai/match` called on submit
- How the response (`match_score`, `matched_skills`, `missing_skills`, `suggestions`) is displayed — the `MatchScoreGauge` component renders the numeric score visually

**What to look for in `AutofillPage.jsx`:**
- The multi-step flow: paste URL → detect fields → auto-map → review/edit → save answers
- How intermediate results from one API call feed into the next (`detect-fields` → `auto-map` → `save-answers`)
- The editable field table: users can correct the AI's mapping before saving

**What you should understand after:**
- How a multi-step UI flow is managed with `useState` for each step's data
- How the frontend chains multiple API calls triggered by user actions

---

## Step 19 — Reusable components

**Files:** `frontend/src/components/Sidebar.jsx`, `frontend/src/components/MatchScoreGauge.jsx`, `frontend/src/components/StatusBadge.jsx`  
**Difficulty:** Beginner–Intermediate  
**Time:** 15 minutes

**Sidebar.jsx** — the navigation component present on every protected page. Shows different links based on the current route (active link is highlighted). Has collapsed and mobile-overlay states.

**MatchScoreGauge.jsx** — a visual component that renders the AI match score (0–100). Look at how it converts a number into a circular arc or bar, and how the colour changes based on the score range.

**StatusBadge.jsx** — renders a coloured pill badge for application statuses. Look at how it maps status strings (`"applied"`, `"interview"`, etc.) to specific colours using an object lookup.

**What you should understand after:**
- Components are small, single-purpose, and receive all their data as props
- Complex visual output (a gauge, a coloured badge) is encapsulated so pages don't need to care about the rendering details

---

## Step 20 — The UI primitive components

**Files:** `frontend/src/components/ui/button.jsx`, `frontend/src/components/ui/card.jsx`, `frontend/src/components/ui/input.jsx`, `frontend/src/components/ui/label.jsx`  
**Difficulty:** Beginner  
**Time:** 10 minutes

These are the lowest-level building blocks.

**What to look for:**
- Each component wraps a native HTML element (`<button>`, `<div>`, `<input>`, `<label>`) with Tailwind classes applied
- `button.jsx` uses `class-variance-authority` (CVA) to define variants like `variant="primary"` vs `variant="outline"` — the variant determines which Tailwind classes are applied
- The `cn()` helper from `lib/utils.js` merges classes without conflicts

**What you should understand after:**
- These components exist so the same button/card/input style is used everywhere with no duplication
- Variant-based styling (CVA) is a clean alternative to long conditional class strings

---

## Step 21 — Migrations (how the DB schema evolved)

**Files:** `backend/alembic/versions/a1644f362892_initial_schema.py`, `backend/alembic/versions/b2755g473903_add_drive_link_to_resumes.py`, `backend/alembic/versions/c3866h584014_add_is_r2_to_resumes.py`  
**Difficulty:** Intermediate  
**Time:** 10 minutes

Read the migration files in order to see how the schema changed over time.

**What to look for:**
- `upgrade()` — the SQL operations applied when migrating forward (e.g. `op.add_column(...)`)
- `downgrade()` — the SQL operations that undo the migration (e.g. `op.drop_column(...)`)
- `down_revision` — the ID of the previous migration; this is how Alembic knows the order

**What you should understand after:**
- How the `drive_link` and `is_r2` columns were added to `resumes` after initial deployment without losing data
- Why every schema change needs both an `upgrade()` and `downgrade()` — so you can roll back if something goes wrong

---

## Step 22 — The environment and deployment config

**Files:** `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/vercel.json`  
**Difficulty:** Intermediate  
**Time:** 15 minutes

**`docker-compose.yml`** — defines the local dev environment: two services (`backend` on port 8000, `frontend` on 5173), a named volume for the SQLite data, and env vars injected from `.env`.

**`backend/Dockerfile`** — copies the Python code, installs dependencies from `requirements.txt`, runs `uvicorn app.main:app`.

**`frontend/Dockerfile`** — copies the Node.js code, installs dependencies, runs `vite` dev server.

**`frontend/vercel.json`** — tells Vercel to redirect all paths to `index.html`. This is essential for an SPA — without it, navigating to `/dashboard` directly would return a 404 from Vercel's file server because there is no `dashboard.html` file.

**What you should understand after:**
- Why two Dockerfiles exist (frontend and backend are separate services)
- Why `vercel.json` needs the catch-all rewrite (React Router handles routing, not the file server)

---

## Summary — Reading order at a glance

```
DOCS (read first)
  1. docs/architecture.md
  2. docs/folder_structure.md
  3. docs/database.md
  4. docs/api_structure.md

BACKEND
  5.  backend/app/models.py          ← What data exists
  6.  backend/app/database.py        ← How the DB connects
  7.  backend/app/schemas.py         ← What JSON looks like
  8.  backend/app/auth.py            ← How auth works
  9.  backend/app/routers/
        application_router.py        ← Simplest router (CRUD only)
  10. backend/app/routers/
        auth_router.py               ← Register + login
        auth_email_router.py         ← Verification + reset
  11. backend/app/routers/
        profile_router.py            ← Profile + saved answers
        resume_router.py             ← File upload + download
  12. backend/app/services/
        r2_service.py                ← Cloud file storage
  13. backend/app/services/
        email_service.py             ← Email sending
  14. backend/app/services/
        ai_service.py                ← LLM calls + prompt engineering
  15. backend/app/routers/
        ai_router.py                 ← AI HTTP endpoints
  16. backend/app/services/
        autofill_service.py          ← Form detection + fill
  17. backend/app/main.py            ← Wires everything together

FRONTEND
  18. frontend/src/api.js            ← HTTP client + interceptors
  19. frontend/src/context/
        AuthContext.jsx              ← Global auth state
  20. frontend/src/App.jsx           ← Routing + layout
  21. frontend/src/pages/
        ApplicationsPage.jsx         ← Simplest page (CRUD)
  22. frontend/src/pages/
        AnalyzePage.jsx              ← AI feature page
        AutofillPage.jsx             ← Multi-step AI flow
  23. frontend/src/components/
        Sidebar.jsx
        MatchScoreGauge.jsx
        StatusBadge.jsx
  24. frontend/src/components/ui/    ← Primitive building blocks

MIGRATIONS + DEPLOYMENT
  25. backend/alembic/versions/      ← Schema history
  26. docker-compose.yml
      backend/Dockerfile
      frontend/Dockerfile
      frontend/vercel.json
```

---

## Tips for faster understanding

**Run the app first.** Before reading any code, run `docker compose up` and click through every page. Understanding what a feature looks like to the user makes the code behind it much easier to follow.

**Trace one feature end-to-end.** After reading the docs, pick one feature (e.g. uploading a resume) and trace it: find the button in the frontend → the `api.post(...)` call → the FastAPI route → the service function → the DB insert → the response back to the frontend. This is more effective than reading files in isolation.

**Use the API docs.** FastAPI auto-generates interactive API docs at `http://localhost:8000/docs`. You can try any endpoint directly in the browser — useful for understanding what a route accepts and returns before reading its code.

**Read `schemas.py` and `models.py` together.** Whenever you see a type like `ApplicationOut` or `ProfileUpdate` in a router, switch to `schemas.py` to see what fields it has. Whenever you see `db.query(Application)`, switch to `models.py` to see the table definition.

**Search for where a function is called.** If you don't understand why a function exists, search the codebase for its name to see where it's used. For example, searching for `get_current_user` shows you every protected endpoint.
