# Implementation Plan — Production & Development Hardening

> Generated after a deep audit of the full codebase (backend + frontend + infra).
> Each item describes **what** to change, **where** to change it, **why** it matters, and **how** to implement it.

---

## Table of Contents

1. [CRITICAL — Security Fixes](#1-critical--security-fixes)
2. [HIGH — Backend Robustness](#2-high--backend-robustness)
3. [HIGH — Frontend Robustness](#3-high--frontend-robustness)
4. [MEDIUM — API & Data Integrity](#4-medium--api--data-integrity)
5. [MEDIUM — Error Handling & UX](#5-medium--error-handling--ux)
6. [MEDIUM — Performance & Scalability](#6-medium--performance--scalability)
7. [LOW — Code Quality & DX](#7-low--code-quality--dx)
8. [LOW — Infrastructure & DevOps](#8-low--infrastructure--devops)

---

## 1. CRITICAL — Security Fixes

### ~~1.1 Remove the hardcoded default SECRET_KEY~~

- **File:** `backend/app/auth.py`, line ~25
- **Current:** `SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-change-me-in-production")`
- **Problem:** If `SECRET_KEY` is not set in production environment variables, the app silently uses this insecure default. An attacker who reads your source code can forge valid JWTs for any user.
- **Fix:** Remove the default value entirely. If `SECRET_KEY` is empty/missing, raise a hard error at startup so the app refuses to boot.
  ```python
  SECRET_KEY = os.getenv("SECRET_KEY", "")
  if not SECRET_KEY:
      raise RuntimeError("FATAL: SECRET_KEY environment variable is not set. Refusing to start.")
  ```

### ~~1.2 Add rate limiting to authentication endpoints~~

- **Files:** `backend/app/routers/auth_router.py`, `backend/app/routers/auth_email_router.py`
- **Problem:** Login (`/api/auth/login`), registration (`/api/auth/register`), forgot-password (`/api/auth/forgot-password`), and send-verification (`/api/auth/send-verification`) have zero rate limiting. An attacker can brute-force credentials or trigger thousands of emails (costing you money on Resend and getting your domain flagged).
- **Fix:** Install `slowapi` (add to `requirements.txt`). Create a shared `Limiter` instance in a new `backend/app/rate_limit.py`. Apply per-IP limits:
  - `/api/auth/login` → 5 requests/minute
  - `/api/auth/register` → 3 requests/minute
  - `/api/auth/forgot-password` → 3 requests/15 minutes
  - `/api/auth/send-verification` → 3 requests/15 minutes
  
  Example:
  ```python
  # backend/app/rate_limit.py
  from slowapi import Limiter
  from slowapi.util import get_remote_address
  limiter = Limiter(key_func=get_remote_address)
  ```
  Then in `main.py`:
  ```python
  from app.rate_limit import limiter
  from slowapi import _rate_limit_exceeded_handler
  from slowapi.errors import RateLimitExceeded
  app.state.limiter = limiter
  app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
  ```
  Then in each router:
  ```python
  from app.rate_limit import limiter
  @router.post("/login")
  @limiter.limit("5/minute")
  def login(request: Request, ...):
  ```

### ~~1.3 Validate and constrain file upload size~~

- **File:** `backend/app/routers/resume_router.py`, `upload_resume()` function
- **Problem:** The endpoint reads `await file.read()` with no size limit. An attacker can upload a multi-GB file, exhausting server memory and crashing the process.
- **Fix:** Read in chunks and enforce a max size (e.g., 10 MB):
  ```python
  MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
  content = await file.read()
  if len(content) > MAX_UPLOAD_SIZE:
      raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")
  ```
  Also add a global request body limit via middleware or reverse proxy.

### ~~1.4 Validate application status values against an allowlist~~

- **File:** `backend/app/schemas.py` — `ApplicationCreate` and `ApplicationUpdate`
- **Problem:** The `status` field accepts any arbitrary string. Users could store scripts or junk values like `"<script>alert(1)</script>"` as status — though sanitize_text strips tags, a proper enum validation is structurally correct.
- **Fix:** Add a `@field_validator` on `status` that checks against the valid list:
  ```python
  VALID_STATUSES = {"draft", "applied", "interview", "offer", "rejected"}

  @field_validator('status', mode='before')
  @classmethod
  def _validate_status(cls, v):
      if v and v not in VALID_STATUSES:
          raise ValueError(f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")
      return v
  ```

### ~~1.5 Password strength validation on registration~~

- **File:** `backend/app/routers/auth_router.py`, `register()` function
- **Problem:** There is no server-side password validation on the registration endpoint. The frontend enforces `minLength={8}`, but the backend accepts passwords of any length, including empty strings. The reset-password endpoint validates `len >= 8`, but registration does not.
- **Fix:** Add validation in the `register()` function before hashing:
  ```python
  if len(payload.password) < 8:
      raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
  ```
  Even better, add it as a Pydantic validator on `UserCreate.password`.

### ~~1.6 Sanitize the `saved-answers` PUT endpoint body~~

- **File:** `backend/app/routers/profile_router.py`, `update_saved_answer()` function
- **Problem:** The `payload` parameter is typed as `dict` (raw), not a Pydantic model. The `question` and `answer` values are stored directly without sanitization, unlike every other user-facing field.
- **Fix:** Create a `SavedAnswerUpdate` Pydantic model with sanitization:
  ```python
  class SavedAnswerUpdate(BaseModel):
      question: Optional[str] = None
      answer: Optional[str] = None

      @field_validator('question', 'answer', mode='before')
      @classmethod
      def _sanitize(cls, v):
          return sanitize_text(v) if isinstance(v, str) else v
  ```
  Replace `payload: dict` with `payload: SavedAnswerUpdate`.

---

## 2. HIGH — Backend Robustness

### ~~2.1 Replace deprecated `datetime.utcnow()` calls~~

- **Files:** All backend files using `datetime.utcnow()` — `models.py`, `auth.py`, `auth_router.py`, `auth_email_router.py`, `email_service.py`, `main.py`
- **Problem:** `datetime.utcnow()` has been deprecated since Python 3.12 and produces naive datetime objects (no timezone info). This can cause subtle bugs in timezone-aware databases.
- **Fix:** Replace all occurrences with `datetime.now(datetime.timezone.utc)`:
  ```python
  from datetime import datetime, timezone
  # Before:  datetime.utcnow()
  # After:   datetime.now(timezone.utc)
  ```
  For SQLAlchemy `Column(DateTime, default=...)`, use:
  ```python
  Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
  ```

### ~~2.2 Add request timeout middleware~~

- **File:** `backend/app/main.py`
- **Problem:** The AI endpoints (`/ai/match`, `/ai/analyze-jd`, `/ai/generate-answer`, `/ai/auto-map`) call external LLM APIs. If the LLM provider is slow or hangs, the request ties up a worker indefinitely. In production with limited Uvicorn workers (often 1-4), this stalls the entire app.
- **Fix:** Add a global timeout middleware. A simple approach:
  ```python
  from starlette.middleware.base import BaseHTTPMiddleware
  import asyncio

  class TimeoutMiddleware(BaseHTTPMiddleware):
      async def dispatch(self, request, call_next):
          try:
              return await asyncio.wait_for(call_next(request), timeout=60)
          except asyncio.TimeoutError:
              return JSONResponse({"detail": "Request timed out"}, status_code=504)

  app.add_middleware(TimeoutMiddleware)
  ```
  The LLM `_llm_call` already has `timeout=30`, but this acts as a safety net for the full request lifecycle.

### ~~2.3 Add health-check endpoint~~

- **File:** `backend/app/main.py`
- **Problem:** There is no dedicated health-check route for monitoring tools (Render, Docker, load balancers). The root `/` endpoint returns static JSON but doesn't verify database connectivity.
- **Fix:** Add a `/health` endpoint:
  ```python
  @app.get("/health")
  def health_check(db: Session = Depends(get_db)):
      try:
          db.execute(text("SELECT 1"))
          return {"status": "healthy", "database": "connected"}
      except Exception:
          return JSONResponse({"status": "unhealthy", "database": "disconnected"}, status_code=503)
  ```

### ~~2.4 Handle `bcrypt` version compatibility issue~~

- **File:** `backend/requirements.txt`
- **Problem:** You pin `passlib[bcrypt]` but use `bcrypt` directly in `auth.py` (not via passlib). The `passlib` dependency is never actually imported — it's dead weight. More critically, you depend on `bcrypt` transitively but don't pin it. Recent `bcrypt` versions (4.1+) changed their API, which can break `passlib` if you ever mix them.
- **Fix:** Either:
  - (a) Remove `passlib[bcrypt]` from `requirements.txt` and explicitly add `bcrypt>=4.0.0` since you use bcrypt directly, OR
  - (b) Refactor `auth.py` to use passlib's `CryptContext` consistently (gives you hash migration support).
  
  Option (a) is simpler since the code already works with raw bcrypt.

### ~~2.5 Add `try/except` around R2 delete in resume deletion~~

- **File:** `backend/app/routers/resume_router.py`, `delete_resume()` function
- **Problem:** `r2_service.delete_file(resume.filepath)` is called but if it throws an exception, the resume record stays in the database and the user sees an error, leaving orphaned state. The `delete_file` function internally catches errors, but if the boto3 client construction itself fails (e.g., missing credentials), it will propagate.
- **Fix:** Wrap the R2 delete in a `try/except` so the DB record is always cleaned up:
  ```python
  if resume.filepath:
      try:
          if resume.is_r2:
              r2_service.delete_file(resume.filepath)
          elif os.path.exists(resume.filepath):
              os.remove(resume.filepath)
      except Exception as e:
          logger.warning(f"Failed to delete file {resume.filepath}: {e}")
  # Always delete the DB record
  db.delete(resume)
  db.commit()
  ```

### 2.6 Remove Playwright from Dockerfile (dead code)

- **File:** `backend/Dockerfile`
- **Problem:** The Dockerfile installs Playwright (`RUN playwright install chromium && playwright install-deps chromium`), but Playwright is not in `requirements.txt` and is not used anywhere in the codebase. The autofill service uses `requests` (HTTP-only parsing), not a browser. This adds ~400MB to the Docker image for nothing.
- **Fix:** Remove these lines from the Dockerfile:
  ```diff
  - RUN playwright install chromium && playwright install-deps chromium
  ```
  Also remove `wget curl` from the `apt-get install` line if not needed elsewhere.

### ~~2.7 Make the database URL replacement logic more robust~~

- **File:** `backend/app/database.py`, lines ~27-29
- **Problem:** The `replace()` calls can mangle URLs. If someone has `DATABASE_URL=postgresql://user:pass@host/db`, the first `replace` changes it to `postgresql+psycopg://user:pass@host/db`. But if the URL is `postgres://...`, the second `replace` on the *already-modified* string does nothing because "postgres://" no longer exists. However, if somehow the URL contains both substrings (unlikely but possible in edge cases), double-replacement could break the URL.
- **Fix:** Use a single conditional:
  ```python
  if DATABASE_URL.startswith("postgres://"):
      DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgres://"):]
  elif DATABASE_URL.startswith("postgresql://"):
      DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgresql://"):]
  ```

---

## 3. HIGH — Frontend Robustness

### ~~3.1 Add global error boundary~~

- **Files:** Create `frontend/src/components/ErrorBoundary.jsx`, update `frontend/src/App.jsx`
- **Problem:** If any React component throws an unhandled error during render, the entire app crashes to a white screen with no way to recover. The user must manually reload.
- **Fix:** Create an `ErrorBoundary` class component:
  ```jsx
  import { Component } from 'react';
  class ErrorBoundary extends Component {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(err, info) { console.error('ErrorBoundary:', err, info); }
    render() {
      if (this.state.hasError) {
        return (
          <div style={{ /* centered error UI */ }}>
            <h2>Something went wrong</h2>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        );
      }
      return this.props.children;
    }
  }
  ```
  Wrap `<Routes>` inside `<ErrorBoundary>` in `App.jsx`.

### ~~3.2 Add toast notifications using Sonner (already installed but unused)~~

- **Files:** `frontend/src/main.jsx`, various page files
- **Problem:** `sonner` is in `package.json` dependencies but is never imported or used. All success/error feedback uses inline state (`error`, `message`), which is inconsistent and easy to miss. Form saves (profile, applications) show no success feedback at all — the user clicks "Save" and has no idea if it worked.
- **Fix:**
  1. In `main.jsx`, add `<Toaster />` from sonner:
     ```jsx
     import { Toaster } from 'sonner';
     // Inside the render:
     <Toaster position="bottom-right" theme="dark" />
     ```
  2. In page files, replace `console.error(err)` with `toast.error('...')` and add `toast.success('...')` after successful operations:
     - `ProfilePage.jsx` → `handleSave()`: add `toast.success('Profile saved')` after success
     - `ResumePage.jsx` → `handleUpload()`: add `toast.success('Resume uploaded')`
     - `ApplicationsPage.jsx` → `handleSave()`: add `toast.success('Application saved')`
     - All `catch` blocks: replace `console.error(err)` with `toast.error(err.response?.data?.detail || 'Something went wrong')`

### ~~3.3 Prevent double form submissions~~

- **Files:** `frontend/src/pages/LoginPage.jsx`, `RegisterPage.jsx`, `ProfilePage.jsx`, `ApplicationsPage.jsx`, `AutofillPage.jsx`
- **Problem:** While buttons show loading states, the forms can still be submitted multiple times via keyboard `Enter` key spam before the loading state kicks in.
- **Fix:** In each `handleSubmit` function, add an early return if already loading:
  ```javascript
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;  // ← add this
    setLoading(true);
    // ...
  };
  ```

### ~~3.4 Fix stale closure in `ResumePage.jsx` drag-and-drop handler~~

- **File:** `frontend/src/pages/ResumePage.jsx`, `handleDrop` callback
- **Problem:** `handleDrop` is wrapped in `useCallback` with an empty dependency array `[]`, but it calls `handleUpload` which is defined outside. If `handleUpload` changes (it won't since it's not in state, but this is a latent bug pattern), the callback will reference a stale version. More importantly, `handleUpload` calls `setAlertMsg` which itself is a closure — this could lead to missed state updates.
- **Fix:** Either add `handleUpload` to the dependency array (potentially causing re-renders) or define `handleUpload` inside a `useCallback` too:
  ```javascript
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file || file.type !== 'application/pdf') {
      setAlertMsg('Only PDF files are supported.');
      return;
    }
    handleUpload(file);
  }, []);  // handleUpload is stable since it's defined at module scope equivalent
  ```
  Actually, the real fix is to use `useCallback` without dependency array (or remove `useCallback` entirely since this handler isn't passed to memoized children).

### ~~3.5 Add loading/skeleton states to all pages~~

- **Files:** `frontend/src/pages/ProfilePage.jsx`, `AnalyzePage.jsx`, `AutofillPage.jsx`
- **Problem:** `ProfilePage` shows a bare spinner; `AnalyzePage` and `AutofillPage` show nothing while loading. Users see a blank page with no feedback during data fetch.
- **Fix:** Replace the minimal spinner with skeleton loaders that match the page layout. At minimum, show a pulsing card placeholder:
  ```jsx
  if (loading) return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
      <div className="h-8 w-32 bg-[var(--muted)] rounded animate-pulse mb-6" />
      <div className="card p-5 mb-4">
        <div className="h-4 w-48 bg-[var(--muted)] rounded animate-pulse mb-3" />
        <div className="h-20 bg-[var(--muted)] rounded animate-pulse" />
      </div>
    </div>
  );
  ```

### ~~3.6 Add `<title>` and meta tags per page (SEO & tab clarity)~~

- **File:** Each page component, or install `react-helmet-async`
- **Problem:** The browser tab always shows "Vite + React" (from `index.html`). Users with multiple tabs can't distinguish pages.
- **Fix:**
  1. Update `frontend/index.html` `<title>` to "JobAssist AI".
  2. Install `react-helmet-async` and set per-page titles:
     ```jsx
     import { Helmet } from 'react-helmet-async';
     // In each page:
     <Helmet><title>Dashboard — JobAssist AI</title></Helmet>
     ```
  Alternatively, use a lightweight `useEffect(() => { document.title = '...'; }, [])` in each page to avoid adding a dependency.

---

## 4. MEDIUM — API & Data Integrity

### 4.1 Add pagination to list endpoints

- **Files:** `backend/app/routers/application_router.py`, `resume_router.py`, `profile_router.py` (saved-answers)
- **Problem:** `list_applications()` and `list_resumes()` return all records with no pagination. For a power user with 500+ applications, this means a multi-MB JSON payload on every load, slow rendering, and potential timeout.
- **Fix:** Add `skip` and `limit` query parameters:
  ```python
  @router.get("", response_model=list[ApplicationOut])
  def list_applications(
      status: Optional[str] = Query(None),
      skip: int = Query(0, ge=0),
      limit: int = Query(50, ge=1, le=200),
      current_user: User = Depends(get_current_user),
      db: Session = Depends(get_db),
  ):
      query = db.query(Application).filter(Application.user_id == current_user.id)
      if status:
          query = query.filter(Application.status == status)
      total = query.count()
      items = query.order_by(Application.applied_at.desc()).offset(skip).limit(limit).all()
      return {"items": items, "total": total}
  ```
  Update the frontend to handle paginated responses (infinite scroll or page buttons).

### 4.2 Add `CASCADE` to QAPair and EmailLog foreign keys in migrations

- **File:** `backend/app/models.py` (already correct at ORM level), but check Alembic migrations
- **Problem:** The SQLAlchemy model defines `cascade="all, delete-orphan"` on the relationship side, but the actual database foreign key may not have `ON DELETE CASCADE` unless the migration explicitly set it. If someone deletes a user directly in the database (not via ORM), orphaned QAPairs and EmailLogs would remain.
- **Fix:** Create a new Alembic migration to add `ondelete="CASCADE"` to the ForeignKey columns:
  ```python
  Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"))
  ```
  Then run `alembic revision --autogenerate -m "add_cascade_to_foreign_keys"` and verify.

### ~~4.3 Validate email format in `UserCreate` schema~~

- **File:** `backend/app/schemas.py`, `UserCreate` class
- **Problem:** `UserCreate.email` is typed as `str`, not `EmailStr`. While `LoginRequest` also uses `str`, the `auth_email_router.py` schemas (`EmailRequest`) correctly use `EmailStr`. This means registration accepts any string as an email — `"not-an-email"` would be stored and a verification email would fail silently.
- **Fix:** Change `UserCreate.email` to `EmailStr`:
  ```python
  class UserCreate(BaseModel):
      email: EmailStr  # was: str
      password: str
      full_name: str
  ```
  Pydantic will auto-validate email format.

### 4.4 Add unique constraint on `QAPair(user_id, question)`

- **File:** `backend/app/models.py`, `QAPair` class
- **Problem:** The `save_answers` endpoint in `ai_router.py` does an upsert (checks for existing pair by user_id + question), but there's no DB unique constraint. A race condition (two concurrent requests) could create duplicate Q&A pairs per user.
- **Fix:** Add a unique constraint:
  ```python
  class QAPair(Base):
      __table_args__ = (
          Index("ix_qa_pairs_user_id", "user_id"),
          UniqueConstraint("user_id", "question", name="uq_qa_pairs_user_question"),
      )
  ```
  Create a migration for this change.

### 4.5 Return consistent response schemas from all endpoints

- **Files:** `backend/app/routers/ai_router.py` — `auto_map()`, `save_answers()`
- **Problem:** Several endpoints return raw dicts instead of Pydantic response models: `auto_map()`, `save_answers()`, `me()`. This means no response validation, inconsistent types, and no auto-generated API docs schemas.
- **Fix:** Create Pydantic response models:
  ```python
  class AutoMapResponse(BaseModel):
      field_values: dict
      saved_answers_count: int = 0

  class SaveAnswersResponse(BaseModel):
      saved_count: int
  ```
  Add `response_model=AutoMapResponse` to the endpoint decorators.

### ~~4.6 Use typed Pydantic model instead of raw `dict` for `auto_map`, `save_answers` payloads~~

- **File:** `backend/app/routers/ai_router.py`
- **Problem:** Both `auto_map()` and `save_answers()` accept `payload: dict` — no input validation, no auto-docs, no sanitization. A malicious user could send unexpected keys.
- **Fix:** Create proper request models:
  ```python
  class AutoMapRequest(BaseModel):
      fields: List[FormField]

  class SaveAnswersRequest(BaseModel):
      fields: List[dict]  # [{label: str, value: str}]
  ```

---

## 5. MEDIUM — Error Handling & UX

### ~~5.1 Handle network failures gracefully in the frontend~~

- **Files:** All page files that call `api.get()` / `api.post()`
- **Problem:** When the backend is unreachable (network down, server crash), Axios throws a `Network Error` with no `response` object. Expressions like `err.response?.data?.detail` return `undefined`, and the user sees "undefined" or a blank error.
- **Fix:** Create a standardized error extraction utility:
  ```javascript
  // frontend/src/lib/errorUtils.js
  export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
    if (err.response?.data?.detail) return err.response.data.detail;
    if (err.message === 'Network Error') return 'Cannot reach the server. Check your connection.';
    return err.message || fallback;
  }
  ```
  Use this everywhere instead of `err.response?.data?.detail || 'fallback'`.

### ~~5.2 Add unsaved changes warning on Profile page~~

- **File:** `frontend/src/pages/ProfilePage.jsx`
- **Problem:** If a user edits their profile extensively and accidentally navigates away (clicks sidebar, closes tab), all changes are lost with no warning.
- **Fix:** Track `isDirty` state and use `beforeunload`:
  ```javascript
  const [isDirty, setIsDirty] = useState(false);
  // Set isDirty=true whenever profile state changes after initial load
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
  ```
  Also use React Router's `useBlocker` or `<Prompt>` to warn on in-app navigation.

### ~~5.3 Show user feedback when profile save succeeds~~

- **File:** `frontend/src/pages/ProfilePage.jsx`, `handleSave()` function
- **Problem:** After clicking "Save", the button shows a spinner briefly, then returns to normal. There is no success feedback (toast, flash message, color change) — the user doesn't know if the save worked or silently failed.
- **Fix:** Add a success toast (see 3.2) or at minimum a temporary "Saved!" text:
  ```javascript
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/profile', profile);
      toast.success('Profile saved');
      setIsDirty(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Save failed'));
    } finally { setSaving(false); }
  };
  ```

### ~~5.4 Handle expired JWT gracefully (auto-redirect with message)~~

- **File:** `frontend/src/api.js` — the 401 interceptor
- **Problem:** When a token expires, the interceptor silently redirects to `/login` without telling the user why. The user is confused — they might think the app crashed.
- **Fix:** Store a "session expired" flag before redirecting, then show it on the login page:
  ```javascript
  // In the 401 interceptor:
  localStorage.setItem('session_expired', 'true');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
  ```
  In `LoginPage.jsx`:
  ```javascript
  useEffect(() => {
    if (localStorage.getItem('session_expired')) {
      setMessage('Session expired. Please sign in again.');
      localStorage.removeItem('session_expired');
    }
  }, []);
  ```

### ~~5.5 Add empty state illustrations and CTAs to all pages~~

- **Files:** `AnalyzePage.jsx`, `AutofillPage.jsx`, `ResumePage.jsx`
- **Problem:** When pages have no data, some show minimal text ("No resumes yet"), but others show nothing at all (Analyze page). This makes the app feel incomplete.
- **Fix:** Add illustrated empty states with clear CTAs. For each page, show a relevant icon, a helpful description, and a primary action button. Example for Analyze page when no results:
  ```jsx
  <div className="card p-16 text-center">
    <ScanSearch className="h-10 w-10 text-[var(--muted-foreground)] mx-auto mb-3 opacity-30" />
    <p className="text-sm font-medium mb-1">Paste a job description above</p>
    <p className="text-xs text-[var(--muted-foreground)]">
      We'll match it against your profile and resume to show a detailed compatibility score.
    </p>
  </div>
  ```

---

## 6. MEDIUM — Performance & Scalability

### ~~6.1 Add `bleach` sanitization or remove it from requirements~~

- **File:** `backend/requirements.txt`
- **Problem:** `bleach==6.2.0` is listed as a dependency but is never imported or used anywhere. The custom `sanitize_text()` function in `utils.py` uses raw regex instead. This is dead weight in the install.
- **Fix:** Either remove `bleach` from `requirements.txt` (preferred — reduces attack surface and install time), OR refactor `sanitize_text()` to use `bleach.clean()` which is more robust than regex-based tag stripping.

### ~~6.2 Cache LLM client instance~~

- **File:** `backend/app/services/ai_service.py`, `_get_llm_client()` function
- **Problem:** Every LLM call creates a new `OpenAI()` client instance. This creates new HTTP connections each time instead of reusing a connection pool.
- **Fix:** Cache the client in a module-level variable:
  ```python
  _cached_client = None
  _cached_model = None

  def _get_llm_client():
      global _cached_client, _cached_model
      if _cached_client is not None:
          return _cached_client, _cached_model
      api_key = os.getenv("LLM_API_KEY", "")
      if not api_key:
          return None, os.getenv("LLM_MODEL", "gpt-3.5-turbo")
      from openai import OpenAI
      _cached_model = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
      _cached_client = OpenAI(api_key=api_key, base_url=os.getenv("LLM_API_URL", "https://api.openai.com/v1"))
      return _cached_client, _cached_model
  ```

### 6.3 Add database connection pool monitoring

- **File:** `backend/app/database.py`
- **Problem:** The pool is configured (`pool_size=5, max_overflow=10`) but there's no visibility into pool exhaustion. If all connections are in use, new requests will wait silently until `pool_timeout=30` and then crash.
- **Fix:** Add pool event listeners for logging:
  ```python
  from sqlalchemy import event

  @event.listens_for(engine, "checkout")
  def checkout_listener(dbapi_conn, connection_record, connection_proxy):
      logger.debug("[DB Pool] Connection checked out")

  @event.listens_for(engine, "checkin")
  def checkin_listener(dbapi_conn, connection_record):
      logger.debug("[DB Pool] Connection returned")
  ```
  In production, surface this via the health-check endpoint (see 2.3).

### ~~6.4 Use `async` HTTP client in autofill service~~

- **File:** `backend/app/services/autofill_service.py`
- **Problem:** `detect_fields()` is an `async` function but uses synchronous `requests.get()`, which blocks the event loop. This means while fetching a form URL, the entire server is frozen (if running with a single worker).
- **Fix:** Replace `requests` with `httpx` (already in `requirements.txt`):
  ```python
  import httpx

  async def detect_fields(url: str) -> dict:
      async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
          resp = await client.get(url, headers=headers)
          resp.raise_for_status()
          html = resp.text
          final_url = str(resp.url)
  ```
  This properly yields the event loop during the HTTP call.

### ~~6.5 Optimize frontend bundle — remove unused `Navbar.jsx`~~

- **File:** `frontend/src/components/Navbar.jsx`
- **Problem:** This component exists but is never imported in `App.jsx` or anywhere else — the app uses `Sidebar.jsx` instead. It's dead code increasing the bundle.
- **Fix:** Delete `Navbar.jsx`. Verify no imports reference it first.

---

## 7. LOW — Code Quality & DX

### ~~7.1 Create a `.env.example` file~~

- **File:** Create `backend/.env.example` (and optionally `.env.example` at root)
- **Problem:** New developers have no idea which environment variables are needed. They'll discover them one by one as the app crashes.
- **Fix:** Create a documented template:
  ```env
  # Required
  SECRET_KEY=your-random-secret-key-here
  DATABASE_URL=postgresql://user:pass@localhost:5432/jobassist

  # Email (Resend)
  RESEND_API_KEY=re_xxxxx
  RESEND_FROM_EMAIL=noreply@yourdomain.com
  RESEND_FROM_NAME=JobAssist AI

  # LLM (Groq / OpenAI / Ollama)
  LLM_API_KEY=your-key
  LLM_API_URL=https://api.groq.com/openai/v1
  LLM_MODEL=llama-3.3-70b-versatile

  # Cloudflare R2 Storage
  R2_ACCESS_KEY_ID=
  R2_SECRET_ACCESS_KEY=
  R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
  R2_BUCKET=job-assist-ai

  # Frontend
  FRONTEND_URL=http://localhost:5173
  APP_BASE_URL=http://localhost:5173
  APP_ENV=development
  ```

### ~~7.2 Add logging configuration~~

- **File:** `backend/app/main.py`
- **Problem:** Logging uses `logging.getLogger(__name__)` everywhere, but `logging.basicConfig()` is never called. In production, log messages may be swallowed, or go to stderr without timestamps/levels.
- **Fix:** Add at the top of `main.py`:
  ```python
  import logging
  logging.basicConfig(
      level=logging.INFO,
      format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
      datefmt="%Y-%m-%d %H:%M:%S",
  )
  ```
  In production, consider using JSON-formatted logs (`python-json-logger`) for log aggregation tools.

### ~~7.3 Standardize `.env` loading — use a single entrypoint~~

- **Files:** `backend/app/database.py`, `backend/app/auth.py`, `backend/app/services/ai_service.py`, `backend/app/services/r2_service.py`, `backend/app/services/email_service.py`
- **Problem:** Every single module independently loads `.env` by computing the path and calling `load_dotenv()`. The path computation is inconsistent too — some go 4 levels up, some go 3. This is brittle and loads the `.env` file 5+ times per startup.
- **Fix:** Load `.env` exactly once, at application startup. The ideal place is `database.py` (which is imported first) or in `main.py` before anything else:
  ```python
  # backend/app/main.py (top of file)
  from dotenv import load_dotenv
  import pathlib
  load_dotenv(pathlib.Path(__file__).resolve().parent.parent.parent / ".env")
  load_dotenv()  # CWD fallback
  ```
  Then remove all other `load_dotenv()` calls from every other module. Environment variables are process-global, so loading once is sufficient.

### 7.4 Add type hints to frontend API layer

- **File:** `frontend/src/api.js`
- **Problem:** All API calls return untyped Axios responses. This means every component does `res.data.detail`, `res.data.fields`, etc. with no autocomplete and no safety if the backend changes response shape.
- **Fix:** Create TypeScript-like JSDoc types or (better) convert key files to TypeScript:
  ```javascript
  /**
   * @typedef {Object} ApplicationOut
   * @property {number} id
   * @property {string} company
   * @property {string} position
   * ...
   */
  ```
  Even without full TS migration, adding JSDoc types to `api.js` methods helps IDE autocomplete.

### ~~7.5 Remove `runtime.txt` redundancy~~

- **Files:** `runtime.txt` (root), `backend/runtime.txt`
- **Problem:** Two `runtime.txt` files exist (one at root, one in `backend/`). Render uses the one in the service's root directory. Having both can cause confusion about which Python version is active.
- **Fix:** Keep only `backend/runtime.txt`. Delete the root-level one.

---

## 8. LOW — Infrastructure & DevOps

### 8.1 Add `.dockerignore` files

- **Files:** Create `backend/.dockerignore`, `frontend/.dockerignore`
- **Problem:** Without `.dockerignore`, Docker COPY copies `__pycache__/`, `.git/`, `node_modules/`, `.env`, etc. into the image, making builds slower and images larger.
- **Fix:**
  ```
  # backend/.dockerignore
  __pycache__
  *.pyc
  .env
  .git
  data/
  .pytest_cache
  ```
  ```
  # frontend/.dockerignore
  node_modules
  .git
  .env
  dist
  ```

### 8.2 Fix frontend Dockerfile for production

- **File:** `frontend/Dockerfile`
- **Problem:** The frontend Dockerfile runs `npm run dev` (Vite dev server with HMR). This is fine for local dev but NOT for production — it's unoptimized, serves source files, and exposes Vite internals. A production Docker build should run `npm run build` and serve the static `dist/` folder with nginx or a static file server.
- **Fix:** Multi-stage Dockerfile:
  ```dockerfile
  # Build stage
  FROM node:20-alpine AS build
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  # Production stage
  FROM nginx:alpine
  COPY --from=build /app/dist /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
  ```
  Create a simple `frontend/nginx.conf` with SPA fallback:
  ```nginx
  server {
    listen 80;
    root /usr/share/nginx/html;
    location / {
      try_files $uri $uri/ /index.html;
    }
  }
  ```

### 8.3 Add Docker Compose production profile

- **File:** `docker-compose.yml`
- **Problem:** The compose file uses SQLite (`sqlite:///data/app.db`) and mounts source code as volumes (for hot-reload). This is fine for dev but wrong for production.
- **Fix:** Create `docker-compose.prod.yml` with:
  - PostgreSQL as a separate service
  - No source volume mounts
  - `restart: unless-stopped` on all services
  - Environment variable for `FRONTEND_URL`
  ```yaml
  version: "3.8"
  services:
    db:
      image: postgres:16-alpine
      environment:
        POSTGRES_DB: jobassist
        POSTGRES_USER: jobassist
        POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      volumes:
        - pgdata:/var/lib/postgresql/data
      restart: unless-stopped

    backend:
      build: ./backend
      ports:
        - "8000:8000"
      environment:
        DATABASE_URL: postgresql://jobassist:${POSTGRES_PASSWORD}@db:5432/jobassist
      env_file: .env
      depends_on: [db]
      restart: unless-stopped

    frontend:
      build:
        context: ./frontend
        dockerfile: Dockerfile.prod  # uses multi-stage build
      ports:
        - "80:80"
      depends_on: [backend]
      restart: unless-stopped

  volumes:
    pgdata:
  ```

### ~~8.4 Add CORS origin validation log + strictness~~

- **File:** `backend/app/main.py`
- **Problem:** CORS uses `allow_methods=["*"]` and `allow_headers=["*"]`. In production, this is unnecessarily permissive. It allows any HTTP method (PUT, DELETE, PATCH, OPTIONS, HEAD) and any header.
- **Fix:** Restrict to actual methods and headers used:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=_cors_origins,
      allow_credentials=True,
      allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allow_headers=["Authorization", "Content-Type"],
  )
  ```

### 8.5 Add Uvicorn production configuration

- **File:** Create `backend/uvicorn_config.py` or update `Dockerfile` CMD
- **Problem:** It's unclear how the backend is started in production. There's no `CMD` in the Dockerfile, and Render/Railway needs a start command.
- **Fix:** Add to `backend/Dockerfile`:
  ```dockerfile
  CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--log-level", "info", "--access-log"]
  ```
  For production with Gunicorn (recommended for process management):
  ```dockerfile
  RUN pip install gunicorn
  CMD ["gunicorn", "app.main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120", "--access-logfile", "-"]
  ```

### ~~8.6 Add `robots.txt` for backend API~~

- **File:** `backend/app/main.py`
- **Problem:** If the backend is publicly accessible, search engines might crawl and index API endpoints, which wastes server resources and can expose endpoint patterns.
- **Fix:** Add a route:
  ```python
  from fastapi.responses import PlainTextResponse
  @app.get("/robots.txt", response_class=PlainTextResponse)
  def robots():
      return "User-agent: *\nDisallow: /\n"
  ```

---

## Summary Priority Matrix

| Priority | Count | Est. Effort | Impact |
|----------|-------|-------------|--------|
| CRITICAL | 6     | 2-3 hours   | Prevents security breaches, data corruption |
| HIGH     | 10    | 4-6 hours   | Prevents crashes, data loss, stuttering UX |
| MEDIUM   | 11    | 6-8 hours   | Improves reliability, scalability, polish |
| LOW      | 11    | 4-6 hours   | Improves DX, maintainability, deployment |

**Recommended implementation order:** 1.1 → 1.2 → 1.3 → 1.5 → 1.4 → 1.6 → 2.1 → 2.6 → 7.3 → 7.1 → 3.2 → 3.1 → 2.3 → 3.3 → 5.1 → 5.3 → rest.
