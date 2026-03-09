# API Structure — JobAssist AI

All endpoints are served by the FastAPI backend at `http://localhost:8000` (dev) or `https://<your-render-domain>` (prod).

**Base URL prefix:** `/api`  
**Auth:** All protected endpoints require a valid JWT — sent either as an `Authorization: Bearer <token>` header or an `access_token` httpOnly cookie.  
**Rate limiting:** SlowAPI enforces per-IP limits on sensitive endpoints (noted per endpoint).

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Email Verification & Password Reset](#2-email-verification--password-reset)
3. [Profile](#3-profile)
4. [Resumes](#4-resumes)
5. [Applications](#5-applications)
6. [AI & Automation](#6-ai--automation)

---

## 1. Authentication

Router file: `backend/app/routers/auth_router.py`  
Prefix: `/api/auth`

---

### `POST /api/auth/register`

**What it does:** Creates a new user account and sends a verification email.

**Rate limit:** 3 requests per minute per IP.

**Request body (JSON):**
```json
{
  "email": "alice@example.com",
  "password": "mypassword123",
  "full_name": "Alice Smith"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `email` | string (email) | Yes | Must be a valid email address |
| `password` | string | Yes | Minimum 8 characters |
| `full_name` | string | Yes | — |

**Internal logic:**
1. Validates password length (≥ 8 chars).
2. Checks if email already exists in `users` table.
   - If the existing account is **already verified** → returns 400 "Email already registered".
   - If it's **unverified** → refreshes the verification token and resends the email instead of creating a duplicate.
3. Hashes the password with bcrypt.
4. Inserts a new `User` row with `is_verified = False` and a 24-hour verification token.
5. Inserts an empty `Profile` row linked to the new user (so `/api/profile` always returns something).
6. Calls Resend API to send a verification email.

**Response (201):**
```json
{
  "id": 1,
  "email": "alice@example.com",
  "full_name": "Alice Smith",
  "is_verified": false,
  "email_sent": true
}
```

In dev mode with no Resend key, also returns:
```json
{ "dev_link": "http://localhost:5173/verify-email?token=..." }
```

**Tables:** `users` (INSERT), `profiles` (INSERT), `email_logs` (INSERT)

---

### `POST /api/auth/login`

**What it does:** Authenticates the user and returns a JWT token.

**Rate limit:** 5 requests per minute per IP.

**Request body (JSON):**
```json
{
  "email": "alice@example.com",
  "password": "mypassword123"
}
```

**Internal logic:**
1. Looks up the user by email in `users`.
2. Verifies the password using bcrypt.
3. Rejects login if `is_verified = False` with a 403 error explaining email must be verified first.
4. Creates a JWT token (HS256, expires 24 hours, contains `user_id`, `email`, `full_name`).
5. Sets the token as an `access_token` httpOnly cookie (7-day expiry; `secure=True`, `samesite=none` in production).
6. Also returns the token in the JSON body for `localStorage` storage by the frontend.

**Response (200):**
```json
{
  "access_token": "eyJhbGci...",
  "message": "Logged in",
  "user": {
    "id": 1,
    "email": "alice@example.com",
    "full_name": "Alice Smith"
  }
}
```

**Error responses:**
| Status | Condition |
|--------|-----------|
| 401 | Wrong email or password |
| 403 | Email not yet verified |

**Tables:** `users` (SELECT)

---

### `POST /api/auth/logout`

**What it does:** Clears the auth cookie, ending the session.

**Auth required:** No (anyone can call it).

**Request:** No body.

**Internal logic:** Deletes the `access_token` cookie by setting it with `max_age=0`.

**Response (200):**
```json
{ "message": "Logged out" }
```

**Tables:** None.

---

### `GET /api/auth/me`

**What it does:** Returns the currently authenticated user's info. Used by the frontend on every page load to confirm the session is still valid.

**Auth required:** Yes.

**Request:** No body, no parameters.

**Internal logic:** Decodes the JWT (from cookie or `Authorization` header), fetches the user from DB, returns their basic info.

**Response (200):**
```json
{
  "id": 1,
  "email": "alice@example.com",
  "full_name": "Alice Smith"
}
```

**Tables:** `users` (SELECT)

---

## 2. Email Verification & Password Reset

Router file: `backend/app/routers/auth_email_router.py`  
Prefix: `/api/auth`

---

### `POST /api/auth/send-verification`

**What it does:** (Re)sends the email verification link to a given email address.

**Rate limit:** 3 requests per 15 minutes per IP.

**Request body (JSON):**
```json
{ "email": "alice@example.com" }
```

**Internal logic:**
1. Looks up the user by email. If not found, returns a generic success message (prevents email enumeration).
2. If already verified → returns 400.
3. Generates a new `secrets.token_urlsafe(32)` token, saves it on the user row with a 24-hour expiry.
4. Calls Resend to send the verification email.

**Response (200):**
```json
{ "detail": "Verification email sent. Please check your inbox." }
```

**Tables:** `users` (SELECT, UPDATE), `email_logs` (INSERT)

---

### `GET /api/auth/verify-email?token=<token>`

**What it does:** Verifies a user's email address using the token from the verification link.

**Auth required:** No.

**Query parameter:**
| Param | Type | Description |
|-------|------|-------------|
| `token` | string | The `token_urlsafe(32)` value from the email link |

**Internal logic:**
1. Looks up the user whose `verification_token` matches the provided token.
2. If not found or token is expired → 400 error.
3. Sets `is_verified = True`, clears `verification_token` and `verification_token_expires`.

**Response (200):**
```json
{ "detail": "Email verified successfully! You can now log in." }
```

**Tables:** `users` (SELECT, UPDATE)

---

### `POST /api/auth/forgot-password`

**What it does:** Sends a password reset link to the provided email.

**Rate limit:** 3 requests per 15 minutes per IP.

**Request body (JSON):**
```json
{ "email": "alice@example.com" }
```

**Internal logic:**
1. Looks up user by email. If not found, returns generic success (prevents enumeration).
2. Generates a reset token, saves it with a **1-hour** expiry on the user row.
3. Sends a password reset email via Resend.

**Response (200):**
```json
{ "detail": "Password reset email sent. Please check your inbox." }
```

**Tables:** `users` (SELECT, UPDATE), `email_logs` (INSERT)

---

### `POST /api/auth/reset-password`

**What it does:** Sets a new password using a valid reset token.

**Auth required:** No (the reset token is the credential).

**Request body (JSON):**
```json
{
  "token": "abc123...",
  "new_password": "newpassword456"
}
```

**Internal logic:**
1. Finds the user whose `reset_token` matches.
2. Checks the token hasn't expired (1-hour window).
3. Validates the new password is ≥ 8 characters.
4. Hashes the new password with bcrypt, saves it.
5. Clears `reset_token` and `reset_token_expires` so the token can't be reused.

**Response (200):**
```json
{ "detail": "Password reset successfully. You can now log in with your new password." }
```

**Tables:** `users` (SELECT, UPDATE)

---

## 3. Profile

Router file: `backend/app/routers/profile_router.py`  
Prefix: `/api/profile`  
**All endpoints require auth.**

---

### `GET /api/profile`

**What it does:** Returns the current user's full profile.

**Request:** No body, no parameters.

**Internal logic:** Queries `profiles` where `user_id = current_user.id`. Returns 404 if no profile exists (shouldn't happen after registration).

**Response (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "phone": "+1-555-0100",
  "linkedin": "https://linkedin.com/in/alice",
  "github": "https://github.com/alice",
  "website": "https://alice.dev",
  "skills": ["Python", "React", "SQL"],
  "experience": [
    {
      "title": "Software Engineer",
      "company": "Acme Corp",
      "duration": "2022-2024",
      "description": "Built backend APIs.",
      "start_date": "",
      "end_date": ""
    }
  ],
  "education": [
    {
      "degree": "B.Sc. Computer Science",
      "institution": "State University",
      "major": "CS",
      "start_year": "2018",
      "end_year": "2022",
      "year": "",
      "gpa": ""
    }
  ],
  "summary": "Full-stack developer with 3 years of experience."
}
```

**Tables:** `profiles` (SELECT)

---

### `PUT /api/profile`

**What it does:** Updates (or creates) the current user's profile. Only fields included in the request are changed.

**Request body (JSON):** Any subset of the fields below.
```json
{
  "phone": "+1-555-0100",
  "linkedin": "https://linkedin.com/in/alice",
  "github": "https://github.com/alice",
  "website": "https://alice.dev",
  "skills": ["Python", "React"],
  "experience": [
    { "title": "Engineer", "company": "Acme", "duration": "2022-2024", "description": "" }
  ],
  "education": [
    { "degree": "B.Sc.", "institution": "State U", "major": "CS", "start_year": "2018", "end_year": "2022" }
  ],
  "summary": "Full-stack developer."
}
```

**Internal logic:**
1. Fetches the profile. If not found, creates a blank one first.
2. Applies only the fields that were included in the request body (`exclude_unset=True`).
3. Converts nested Pydantic models (experience, education) to plain dicts for JSON column storage.
4. Saves and returns the updated profile.

**Response (200):** Same shape as `GET /api/profile`.

**Tables:** `profiles` (SELECT, UPDATE or INSERT)

---

### `GET /api/profile/saved-answers`

**What it does:** Returns all Q&A pairs the user has previously saved (learned from form autofill submissions).

**Response (200):**
```json
[
  { "id": 1, "question": "Why do you want this role?", "answer": "I am passionate about..." },
  { "id": 2, "question": "Years of experience with Python?", "answer": "3" }
]
```

**Tables:** `qa_pairs` (SELECT)

---

### `PUT /api/profile/saved-answers/{answer_id}`

**What it does:** Edits the question or answer text of a saved Q&A pair.

**Path parameter:** `answer_id` (integer) — ID of the `QAPair`.

**Request body (JSON):**
```json
{
  "question": "Updated question text",
  "answer": "Updated answer text"
}
```
Both fields are optional; omit either to leave it unchanged.

**Internal logic:** Looks up the `QAPair` by `id` AND `user_id` (so users can only edit their own). Returns 404 if not found.

**Response (200):**
```json
{ "id": 1, "question": "Updated question text", "answer": "Updated answer text" }
```

**Tables:** `qa_pairs` (SELECT, UPDATE)

---

### `DELETE /api/profile/saved-answers/{answer_id}`

**What it does:** Permanently deletes a saved Q&A pair.

**Path parameter:** `answer_id` (integer).

**Internal logic:** Fetches the pair, checks ownership, deletes it.

**Response (200):**
```json
{ "ok": true }
```

**Tables:** `qa_pairs` (SELECT, DELETE)

---

## 4. Resumes

Router file: `backend/app/routers/resume_router.py`  
Prefix: `/api/resumes`  
**All endpoints require auth.**

---

### `GET /api/resumes`

**What it does:** Lists all resumes belonging to the current user, newest first.

**Request:** No body, no parameters.

**Response (200):**
```json
[
  {
    "id": 1,
    "filename": "alice_resume.pdf",
    "is_default": true,
    "is_r2": true,
    "drive_link": null,
    "uploaded_at": "2025-03-01T10:00:00",
    "has_file": true
  }
]
```

> `has_file` is `true` when a physical file exists (R2 or local). `is_r2` is `true` when stored in Cloudflare R2.

**Tables:** `resumes` (SELECT)

---

### `POST /api/resumes/upload`

**What it does:** Uploads a PDF resume to Cloudflare R2 and creates a `resumes` record.

**Request:** `multipart/form-data` — field name `file`.

| Field | Type | Rules |
|-------|------|-------|
| `file` | File (PDF) | Must be `.pdf`, max 10 MB |

**Internal logic:**
1. Validates file extension (`.pdf` only) and size (≤ 10 MB).
2. Generates a unique filename using `uuid4()` to avoid collisions.
3. Checks that R2 is configured — returns 503 if not.
4. Uploads bytes to R2 at key `resumes/<uuid>_<original_name>.pdf`.
5. Creates a `Resume` row with `is_r2 = True` and `filepath = R2 object key`.
6. If this is the user's first resume, sets `is_default = True` automatically.

**Response (201):** `ResumeOut` object (same shape as list item above).

**Tables:** `resumes` (INSERT, SELECT for count)  
**External:** Cloudflare R2 (PUT)

---

### `POST /api/resumes/link`

**What it does:** Saves a link-only resume entry (e.g. a Google Drive link) without uploading a file.

**Request body (JSON):**
```json
{
  "title": "My Resume (Google Drive)",
  "url": "https://drive.google.com/file/d/..."
}
```

**Internal logic:** Creates a `Resume` row with `filepath = ""`, `drive_link = url`, `is_r2 = False`. Sets `is_default` if this is the user's first entry.

**Response (201):** `ResumeOut` object.

**Tables:** `resumes` (INSERT, SELECT for count)

---

### `PATCH /api/resumes/{resume_id}/link`

**What it does:** Adds or updates the Google Drive link on an existing resume record.

**Path parameter:** `resume_id` (integer).

**Request body (JSON):**
```json
{ "drive_link": "https://drive.google.com/file/d/..." }
```
Send `null` or omit to remove the link.

**Response (200):** `ResumeOut` object.

**Tables:** `resumes` (SELECT, UPDATE)

---

### `GET /api/resumes/{resume_id}/download`

**What it does:** Streams the resume PDF back to the browser for download or inline viewing.

**Path parameter:** `resume_id` (integer).

**Query parameter:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | string | `download` | `download` = save as file; `view` = open inline in browser |

**Internal logic:**
1. Fetches the `Resume` row, ensures it belongs to the current user.
2. If `is_r2 = True` → downloads bytes from Cloudflare R2, streams them via `StreamingResponse`.
3. If local file → returns via `FileResponse`.
4. Sets `Content-Disposition` header based on `mode` param.

**Response:** Binary PDF stream with `Content-Type: application/pdf`.

**Tables:** `resumes` (SELECT)  
**External:** Cloudflare R2 (GET, if `is_r2`)

---

### `PUT /api/resumes/{resume_id}/default`

**What it does:** Marks one resume as the default. The default resume is used by all AI features.

**Path parameter:** `resume_id` (integer).

**Request:** No body.

**Internal logic:**
1. Finds the resume (must belong to the current user).
2. Sets `is_default = False` on **all** of the user's resumes.
3. Sets `is_default = True` on the specified resume.

**Response (200):** `ResumeOut` object with `"is_default": true`.

**Tables:** `resumes` (SELECT, UPDATE ×2)

---

### `DELETE /api/resumes/{resume_id}`

**What it does:** Deletes a resume record and its file from Cloudflare R2.

**Path parameter:** `resume_id` (integer).

**Internal logic:**
1. Fetches the resume, checks ownership.
2. If `is_r2 = True`, attempts to delete the object from R2 (logs a warning if it fails but continues — the DB row is always removed).
3. Deletes the `Resume` row.

**Response (200):**
```json
{ "detail": "Resume deleted" }
```

**Tables:** `resumes` (SELECT, DELETE)  
**External:** Cloudflare R2 (DELETE, if `is_r2`)

---

## 5. Applications

Router file: `backend/app/routers/application_router.py`  
Prefix: `/api/applications`  
**All endpoints require auth.**

Valid status values: `draft`, `applied`, `interview`, `offer`, `rejected`.

---

### `GET /api/applications`

**What it does:** Returns all of the user's job applications, newest first.

**Query parameter (optional):**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status (e.g. `?status=applied`) |

**Response (200):**
```json
[
  {
    "id": 1,
    "company": "Acme Corp",
    "position": "Backend Engineer",
    "url": "https://jobs.acme.com/123",
    "status": "applied",
    "match_score": 78.5,
    "applied_at": "2025-03-01T09:00:00",
    "notes": "Referred by John."
  }
]
```

**Tables:** `applications` (SELECT, optionally filtered by `user_id` + `status`)

---

### `POST /api/applications`

**What it does:** Creates a new job application record.

**Request body (JSON):**
```json
{
  "company": "Acme Corp",
  "position": "Backend Engineer",
  "url": "https://jobs.acme.com/123",
  "status": "applied",
  "match_score": 78.5,
  "notes": "Referred by John."
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `company` | string | Yes | — |
| `position` | string | Yes | — |
| `url` | string | No | Defaults to `""` |
| `status` | string | No | Defaults to `"applied"`; must be a valid status |
| `match_score` | float | No | Typically set after running AI match |
| `notes` | string | No | Free text |

**Response (201):** `ApplicationOut` object.

**Tables:** `applications` (INSERT)

---

### `PUT /api/applications/{app_id}`

**What it does:** Updates any field(s) of an existing application.

**Path parameter:** `app_id` (integer).

**Request body (JSON):** Any subset of the `ApplicationCreate` fields. Only included fields are updated.

**Internal logic:** Fetches the application by `id` AND `user_id`. Updates only non-null provided fields.

**Response (200):** Updated `ApplicationOut` object.

**Tables:** `applications` (SELECT, UPDATE)

---

### `DELETE /api/applications/{app_id}`

**What it does:** Permanently deletes an application record.

**Path parameter:** `app_id` (integer).

**Response (200):**
```json
{ "detail": "Application deleted" }
```

**Tables:** `applications` (SELECT, DELETE)

---

## 6. AI & Automation

Router file: `backend/app/routers/ai_router.py`  
Prefix: `/api/ai`  
**All endpoints require auth.**

These endpoints call the external LLM API (Groq/OpenAI). The model, API key, and endpoint URL are configured via environment variables (`LLM_MODEL`, `LLM_API_KEY`, `LLM_API_URL`).

---

### `POST /api/ai/match`

**What it does:** Scores how well the user's resume and skills match a job description. Returns a 0–100 score with a full breakdown.

**Request body (JSON):**
```json
{ "job_description": "We are looking for a Python developer with experience in FastAPI..." }
```

**Internal logic:**
1. Loads the user's `Profile` (skills list + summary).
2. Downloads text from the user's **default** resume PDF (from R2 or locally using `PyPDF2`). Truncated to 3000 chars.
3. Calls `ai_service.compute_match_score()` which sends both the JD text and the combined profile/resume to the LLM.
4. The LLM returns JSON with `match_score`, `matched_skills`, `missing_skills`, `breakdown`, `suggestions`, etc.

**Response (200):**
```json
{
  "match_score": 78.5,
  "matched_skills": ["Python", "FastAPI", "SQL"],
  "missing_skills": ["Kubernetes", "Go"],
  "breakdown": {
    "keyword_score": 80.0,
    "skills_score": 75.0,
    "experience_score": 82.0,
    "education_score": 70.0
  },
  "matched_keywords": ["REST API", "backend", "microservices"],
  "missing_keywords": ["CI/CD", "Docker"],
  "suggestions": ["Add Docker experience to resume.", "Highlight API design."],
  "reasoning": "The candidate has strong Python and FastAPI experience but lacks DevOps skills."
}
```

**Tables:** `profiles` (SELECT), `resumes` (SELECT)  
**External:** Cloudflare R2 (GET, for resume PDF), LLM API

---

### `POST /api/ai/generate-answer`

**What it does:** Generates a tailored answer to a job application question using the user's profile and resume as context.

**Request body (JSON):**
```json
{
  "question": "Why do you want to work at our company?",
  "job_description": "We are building the future of AI hiring tools..."
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `question` | Yes | The exact question from the application form |
| `job_description` | No | Providing the JD improves answer relevance |

**Internal logic:**
1. Loads the user's profile (summary + skills) and default resume text.
2. Passes all context to `ai_service.generate_answer()`, which prompts the LLM to write a first-person, concise answer.

**Response (200):**
```json
{ "answer": "I'm excited about your mission to transform hiring because..." }
```

**Tables:** `profiles` (SELECT), `resumes` (SELECT)  
**External:** Cloudflare R2 (GET), LLM API

---

### `POST /api/ai/analyze-jd`

**What it does:** Parses a job description and extracts structured information: required skills, experience level, key responsibilities, and how well the user's resume fits.

**Request body (JSON):**
```json
{ "job_description": "Senior Python Engineer at Acme Corp. Must have 5+ years..." }
```

**Internal logic:**
1. Loads the user's default resume text (to compute `resume_fit`, `resume_gaps`, `resume_strengths`).
2. Passes the JD to `ai_service.parse_job_description()` which prompts the LLM to return structured JSON.

**Response (200):**
```json
{
  "title": "Senior Python Engineer",
  "company": "Acme Corp",
  "required_skills": ["Python", "SQL", "Docker"],
  "nice_to_have_skills": ["Kubernetes", "Go"],
  "experience_level": "Senior (5+ years)",
  "summary": "Backend-focused role building data pipelines...",
  "key_responsibilities": ["Design REST APIs", "Mentor junior engineers"],
  "resume_fit": "Strong match — your Python and SQL experience align well.",
  "resume_gaps": ["No Docker experience listed"],
  "resume_strengths": ["FastAPI", "PostgreSQL", "CI/CD pipelines"]
}
```

**Tables:** `resumes` (SELECT)  
**External:** Cloudflare R2 (GET), LLM API

---

### `POST /api/ai/detect-fields`

**What it does:** Fetches a job application form URL and returns all detected form fields (label, type, options).

**Request body (JSON):**
```json
{ "url": "https://docs.google.com/forms/d/e/1FAIpQLSe.../viewform" }
```

**Internal logic:**
1. Uses `httpx` to fetch the page HTML (no browser needed).
2. Detects the platform (Google Forms, Microsoft Forms, Typeform, JotForm, or generic HTML).
3. Parses the HTML to extract field labels, types (`text`, `radio`, `dropdown`, `checkbox`, `file`), and options for multi-choice fields.

**Response (200):**
```json
{
  "platform": "google_forms",
  "form_url": "https://docs.google.com/forms/d/e/1FAIpQLSe.../viewform",
  "fields": [
    { "field_id": "entry.12345", "label": "Full Name", "field_type": "text", "options": [] },
    { "field_id": "entry.67890", "label": "Years of Experience", "field_type": "radio", "options": ["0-2", "3-5", "5+"] }
  ]
}
```

**Tables:** None  
**External:** The form URL (HTTP GET via httpx)

---

### `POST /api/ai/auto-map`

**What it does:** Given a list of detected form fields, maps each one to the best matching value from the user's profile, saved answers, and resume.

**Request body (JSON):**
```json
{
  "fields": [
    { "field_id": "entry.12345", "label": "Full Name", "field_type": "text", "options": [] },
    { "field_id": "entry.67890", "label": "LinkedIn URL", "field_type": "text", "options": [] }
  ]
}
```

**Internal logic:**
1. Loads the user's full profile (name, email, phone, LinkedIn, GitHub, skills, experience, education, summary).
2. Loads all `QAPair` rows for the user (previously saved answers from Autofill).
3. Loads the default resume text and `drive_link` (if set).
4. Calls `ai_service.auto_map_fields()` which uses the LLM to intelligently match field labels to profile data.
5. Returns a mapping of `field_id → suggested_value`.

**Response (200):**
```json
{
  "field_map": {
    "entry.12345": "Alice Smith",
    "entry.67890": "https://linkedin.com/in/alice"
  },
  "saved_answers_count": 5
}
```

**Tables:** `profiles` (SELECT), `qa_pairs` (SELECT), `resumes` (SELECT)  
**External:** Cloudflare R2 (GET), LLM API

---

### `POST /api/ai/save-answers`

**What it does:** Saves the final filled field values from an autofill session so they can be reused in future `auto-map` calls.

**Request body (JSON):**
```json
{
  "fields": [
    { "label": "Full Name", "value": "Alice Smith" },
    { "label": "Why do you want this job?", "value": "I find the mission compelling because..." }
  ]
}
```

**Internal logic:**
1. Iterates over each `{label, value}` pair.
2. Skips empty labels or values.
3. For each non-empty pair:
   - If a `QAPair` with the same `question` (= label) already exists → updates its `answer`.
   - Otherwise → inserts a new `QAPair`.

**Response (200):**
```json
{ "saved_count": 2 }
```

**Tables:** `qa_pairs` (SELECT, UPDATE or INSERT)

---

### `POST /api/ai/fill-form`

**What it does:** Takes a form URL and a completed field map and attempts to generate a pre-filled URL (for platforms that support it, e.g. Google Forms).

**Request body (JSON):**
```json
{
  "url": "https://docs.google.com/forms/d/e/1FAIpQLSe.../viewform",
  "field_map": {
    "entry.12345": "Alice Smith",
    "entry.67890": "https://linkedin.com/in/alice"
  }
}
```

**Internal logic:** Calls `autofill_service.fill_form()` which re-fetches the form, builds the pre-fill query parameters (for Google Forms: `?entry.XXXXX=value&...`), and returns the result.

**Response (200):**
```json
{
  "success": true,
  "filled_count": 2,
  "errors": [],
  "prefilled_url": "https://docs.google.com/forms/d/e/1FAIpQLSe.../viewform?entry.12345=Alice+Smith&entry.67890=https%3A%2F%2Flinkedin.com..."
}
```

**Tables:** None  
**External:** The form URL (HTTP GET via httpx)

---

## Error Response Format

All errors follow FastAPI's standard format:

```json
{ "detail": "Human-readable error message here." }
```

Common HTTP status codes:

| Code | Meaning |
|------|---------|
| 400 | Bad request — validation failed or business rule violated |
| 401 | Unauthenticated — missing or invalid JWT |
| 403 | Forbidden — account not verified |
| 404 | Resource not found (or doesn't belong to you) |
| 413 | Payload too large (file upload > 10 MB) |
| 422 | Unprocessable entity — Pydantic schema validation failed |
| 429 | Too many requests — rate limit exceeded |
| 500 | Server error — LLM call failed, R2 error, etc. |
| 503 | Service unavailable — R2 not configured |

---

## Quick Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | No | Create account + send verification email |
| POST | `/api/auth/login` | No | Login → JWT cookie + token |
| POST | `/api/auth/logout` | No | Clear auth cookie |
| GET | `/api/auth/me` | Yes | Get current user info |
| POST | `/api/auth/send-verification` | No | Resend verification email |
| GET | `/api/auth/verify-email` | No | Verify email with token |
| POST | `/api/auth/forgot-password` | No | Send password reset email |
| POST | `/api/auth/reset-password` | No | Set new password with token |
| GET | `/api/profile` | Yes | Get user profile |
| PUT | `/api/profile` | Yes | Update user profile |
| GET | `/api/profile/saved-answers` | Yes | List saved Q&A pairs |
| PUT | `/api/profile/saved-answers/{id}` | Yes | Edit a saved answer |
| DELETE | `/api/profile/saved-answers/{id}` | Yes | Delete a saved answer |
| GET | `/api/resumes` | Yes | List all resumes |
| POST | `/api/resumes/upload` | Yes | Upload PDF to R2 |
| POST | `/api/resumes/link` | Yes | Save a Drive link as resume |
| PATCH | `/api/resumes/{id}/link` | Yes | Update Drive link on a resume |
| GET | `/api/resumes/{id}/download` | Yes | Stream PDF from R2 |
| PUT | `/api/resumes/{id}/default` | Yes | Set as default resume |
| DELETE | `/api/resumes/{id}` | Yes | Delete resume + R2 file |
| GET | `/api/applications` | Yes | List applications (filterable by status) |
| POST | `/api/applications` | Yes | Create application |
| PUT | `/api/applications/{id}` | Yes | Update application |
| DELETE | `/api/applications/{id}` | Yes | Delete application |
| POST | `/api/ai/match` | Yes | AI resume match score |
| POST | `/api/ai/generate-answer` | Yes | AI-generated answer to a question |
| POST | `/api/ai/analyze-jd` | Yes | Parse + analyze a job description |
| POST | `/api/ai/detect-fields` | Yes | Detect form fields from a URL |
| POST | `/api/ai/auto-map` | Yes | Map profile data to form fields |
| POST | `/api/ai/save-answers` | Yes | Save filled answers for future use |
| POST | `/api/ai/fill-form` | Yes | Generate a pre-filled form URL |
