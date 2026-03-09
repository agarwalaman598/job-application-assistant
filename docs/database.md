# Database Schema — JobAssist AI

This document describes every table in the database, its columns, its relationships to other tables, its purpose, and which API endpoints read from or write to it.

---

## Overview

**ORM:** SQLAlchemy  
**Migrations:** Alembic  
**Production engine:** PostgreSQL (via `psycopg` v3 driver)  
**Local dev fallback:** SQLite (auto-used when `DATABASE_URL` is not set)

The schema has **6 tables**:

```
users
  ├── profiles      (one-to-one)
  ├── resumes       (one-to-many)
  ├── applications  (one-to-many)
  ├── qa_pairs      (one-to-many)
  └── email_logs    (one-to-many)
```

Everything hangs off `users`. Every other table is owned by a user and is deleted automatically when that user is deleted (`cascade="all, delete-orphan"`).

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                          users                              │
│  PK  id               INT                                   │
│      email            VARCHAR(255)  UNIQUE                  │
│      hashed_password  VARCHAR(255)                          │
│      full_name        VARCHAR(255)                          │
│      created_at       DATETIME                              │
│      is_verified      BOOLEAN                               │
│      verification_token  VARCHAR(128)                       │
│      verification_token_expires  DATETIME                   │
│      reset_token      VARCHAR(128)                          │
│      reset_token_expires  DATETIME                          │
└───────────┬─────────────────────────────────────────────────┘
            │ user_id (FK)
            │
     ┌──────┴────────────────────────────────────────────────┐
     │                                                        │
     ▼                                                        │
┌─────────────────┐   ┌──────────────────┐                  │
│    profiles     │   │     resumes      │                  │
│  PK id          │   │  PK id           │                  │
│  FK user_id ───◀│   │  FK user_id ───◀─│                  │
│     phone       │   │     filename     │                  │
│     linkedin    │   │     filepath     │                  │
│     github      │   │     drive_link   │                  │
│     website     │   │     is_r2        │                  │
│     skills JSON │   │     is_default   │                  │
│     experience  │   │     uploaded_at  │                  │
│       JSON      │   └──────────────────┘                  │
│     education   │                                           │
│       JSON      │   ┌──────────────────┐                  │
│     summary     │   │   applications   │                  │
└─────────────────┘   │  PK id           │                  │
                       │  FK user_id ───◀─│                  │
                       │     company      │                  │
                       │     position     │                  │
                       │     url          │                  │
                       │     status       │                  │
                       │     match_score  │                  │
                       │     applied_at   │                  │
                       │     notes        │                  │
                       └──────────────────┘                  │
                                                             │
                       ┌──────────────────┐                  │
                       │    qa_pairs      │                  │
                       │  PK id           │                  │
                       │  FK user_id ───◀─│                  │
                       │     question     │                  │
                       │     answer       │                  │
                       │     embedding    │                  │
                       └──────────────────┘                  │
                                                             │
                       ┌──────────────────┐                  │
                       │   email_logs     │                  │
                       │  PK id           │                  │
                       │  FK user_id ───◀─┘                  │
                       │     to_email     │
                       │     subject      │
                       │     email_type   │
                       │     status       │
                       │     error_message│
                       │     sent_at      │
                       └──────────────────┘
```

---

## Table: `users`

**Purpose:** The central identity table. Every account in the system is one row here. Stores credentials, email verification state, and password reset tokens.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No | auto-increment | Primary key |
| `email` | VARCHAR(255) | No | — | Unique login identifier. Indexed. |
| `hashed_password` | VARCHAR(255) | No | — | bcrypt hash of the user's password. Plain-text password is never stored. |
| `full_name` | VARCHAR(255) | No | — | Display name shown in the UI. |
| `created_at` | DATETIME | No | `utcnow()` | Timestamp of account creation. Used by the cleanup scheduler. |
| `is_verified` | BOOLEAN | No | `False` | Whether the user clicked the email verification link. Login is blocked until `True`. |
| `verification_token` | VARCHAR(128) | Yes | `NULL` | A 32-byte URL-safe random token. Set on registration; cleared after verification. |
| `verification_token_expires` | DATETIME | Yes | `NULL` | When the verification token expires (24 hours from creation). |
| `reset_token` | VARCHAR(128) | Yes | `NULL` | A 32-byte URL-safe random token. Set when "Forgot password" is requested; cleared after use. |
| `reset_token_expires` | DATETIME | Yes | `NULL` | When the reset token expires (1 hour from creation). |

### Indexes
- `PRIMARY KEY (id)`
- `UNIQUE INDEX ON email`
- `INDEX ON verification_token` (fast lookup when verifying email)
- `INDEX ON reset_token` (fast lookup when resetting password)

### Relationships

| Relationship | Type | Target | Cascade |
|-------------|------|--------|---------|
| `profile` | One-to-one | `profiles.user_id` | delete-orphan |
| `resumes` | One-to-many | `resumes.user_id` | delete-orphan |
| `applications` | One-to-many | `applications.user_id` | delete-orphan |
| `qa_pairs` | One-to-many | `qa_pairs.user_id` | delete-orphan |
| `email_logs` | One-to-many | `email_logs.user_id` | delete-orphan |

> **cascade="all, delete-orphan"** means: when a `User` row is deleted, all related rows in all five child tables are automatically deleted too. No orphan data is left behind.

### Which APIs use it

| Endpoint | Operation | Why |
|----------|-----------|-----|
| `POST /api/auth/register` | SELECT, INSERT | Check email uniqueness, create account |
| `POST /api/auth/login` | SELECT | Fetch user by email to verify password |
| `GET /api/auth/me` | SELECT | Return current user info |
| `POST /api/auth/send-verification` | SELECT, UPDATE | Refresh verification token |
| `GET /api/auth/verify-email` | SELECT, UPDATE | Consume token, set `is_verified=True` |
| `POST /api/auth/forgot-password` | SELECT, UPDATE | Write reset token |
| `POST /api/auth/reset-password` | SELECT, UPDATE | Consume reset token, write new hash |
| All protected endpoints | SELECT | `get_current_user()` loads the user on every authenticated request |

---

## Table: `profiles`

**Purpose:** Stores the user's professional profile — the structured information that feeds every AI feature. Without a profile, the AI has no context about the user.

One profile row is automatically created (empty) when a user registers. There is always exactly one profile per user.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No | auto-increment | Primary key |
| `user_id` | INTEGER | No | — | Foreign key → `users.id`. Unique (enforces one-to-one). |
| `phone` | VARCHAR(50) | Yes | `""` | Contact phone number. |
| `linkedin` | VARCHAR(255) | Yes | `""` | LinkedIn profile URL. |
| `github` | VARCHAR(255) | Yes | `""` | GitHub profile URL. |
| `website` | VARCHAR(255) | Yes | `""` | Personal website URL. |
| `skills` | JSON | Yes | `[]` | List of skill strings. Example: `["Python", "React", "SQL"]`. |
| `experience` | JSON | Yes | `[]` | List of experience objects. See structure below. |
| `education` | JSON | Yes | `[]` | List of education objects. See structure below. |
| `summary` | TEXT | Yes | `""` | Free-text professional summary / bio. |

### JSON column structures

**`skills`** — a flat list of strings:
```json
["Python", "FastAPI", "PostgreSQL", "React", "Docker"]
```

**`experience`** — a list of job objects:
```json
[
  {
    "title": "Backend Engineer",
    "company": "Acme Corp",
    "duration": "2022–2024",
    "description": "Built REST APIs using FastAPI and PostgreSQL.",
    "start_date": "",
    "end_date": ""
  }
]
```

**`education`** — a list of degree objects:
```json
[
  {
    "degree": "B.Sc. Computer Science",
    "institution": "State University",
    "major": "Computer Science",
    "start_year": "2018",
    "end_year": "2022",
    "year": "",
    "gpa": ""
  }
]
```

> JSON columns allow flexible, schema-free nested data without needing additional tables. The trade-off is that you can't query into these fields with SQL — they are always loaded and parsed in application code.

### Relationships

| Relationship | Type | Target |
|-------------|------|--------|
| `user` | Many-to-one (back-ref) | `users.id` |

### Which APIs use it

| Endpoint | Operation | Why |
|----------|-----------|-----|
| `POST /api/auth/register` | INSERT | Auto-create empty profile on signup |
| `GET /api/profile` | SELECT | Return the user's full profile |
| `PUT /api/profile` | SELECT, UPDATE (or INSERT) | Merge new field values |
| `POST /api/ai/match` | SELECT | Provide skills + summary to LLM |
| `POST /api/ai/generate-answer` | SELECT | Provide context for answer generation |
| `POST /api/ai/auto-map` | SELECT | Provide all profile data for field mapping |

---

## Table: `resumes`

**Purpose:** Tracks metadata about each resume the user has uploaded or linked. The actual PDF bytes are stored in Cloudflare R2 — this table only stores the reference (the R2 object key or a Google Drive link), not the file itself.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No | auto-increment | Primary key |
| `user_id` | INTEGER | No | — | Foreign key → `users.id` |
| `filename` | VARCHAR(255) | No | — | Original filename shown in the UI (e.g. `alice_resume.pdf`) |
| `filepath` | VARCHAR(500) | No | `""` | R2 object key when `is_r2=True` (e.g. `resumes/abc123_resume.pdf`), or local path for legacy files. Empty string for link-only resumes. |
| `drive_link` | VARCHAR(1000) | Yes | `NULL` | Optional Google Drive (or other) URL. Shared with the LLM as a resume link when doing auto-mapping. |
| `is_r2` | BOOLEAN | No | `False` | `True` = `filepath` is a Cloudflare R2 key. `False` = local file or link-only. |
| `is_default` | BOOLEAN | No | `False` | Only one resume per user should have this as `True`. AI features always use the default resume. |
| `uploaded_at` | DATETIME | No | `utcnow()` | When the resume was added. Used for ordering. |

### Indexes
- `INDEX ON user_id` — speeds up "list my resumes" queries

### Relationships

| Relationship | Type | Target |
|-------------|------|--------|
| `user` | Many-to-one (back-ref) | `users.id` |

### `is_r2` vs `drive_link` vs local

| Scenario | `is_r2` | `filepath` | `drive_link` | `has_file` (computed) |
|----------|---------|-----------|-------------|----------------------|
| PDF uploaded via app | `True` | R2 key | `NULL` or set | `True` |
| Link-only (Drive) | `False` | `""` | Drive URL | `False` |
| Legacy local file (dev) | `False` | `/data/resumes/x.pdf` | `NULL` | `True` |

### Which APIs use it

| Endpoint | Operation | Why |
|----------|-----------|-----|
| `GET /api/resumes` | SELECT | List all resumes for current user |
| `POST /api/resumes/upload` | SELECT (count), INSERT | Count existing, create new row after R2 upload |
| `POST /api/resumes/link` | SELECT (count), INSERT | Create link-only row |
| `PATCH /api/resumes/{id}/link` | SELECT, UPDATE | Add/update Drive link |
| `GET /api/resumes/{id}/download` | SELECT | Fetch filepath for file streaming |
| `PUT /api/resumes/{id}/default` | SELECT, UPDATE ×2 | Unset all defaults, set new one |
| `DELETE /api/resumes/{id}` | SELECT, DELETE | Remove row (and R2 file) |
| `POST /api/ai/match` | SELECT | Find default resume for text extraction |
| `POST /api/ai/generate-answer` | SELECT | Find default resume for context |
| `POST /api/ai/analyze-jd` | SELECT | Find default resume for context |
| `POST /api/ai/auto-map` | SELECT | Get `drive_link` to include in mapped fields |

---

## Table: `applications`

**Purpose:** The job application tracker. Each row is one job the user applied to (or is tracking). Stores company, position, status, URL, match score, and notes.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No | auto-increment | Primary key |
| `user_id` | INTEGER | No | — | Foreign key → `users.id` |
| `company` | VARCHAR(255) | No | — | Name of the company |
| `position` | VARCHAR(255) | No | — | Job title / role name |
| `url` | VARCHAR(500) | Yes | `""` | Link to the job posting |
| `status` | VARCHAR(50) | Yes | `"applied"` | Current stage. One of: `draft`, `applied`, `interview`, `offer`, `rejected` |
| `match_score` | FLOAT | Yes | `NULL` | AI-computed match score (0–100). `NULL` until the user runs a match analysis. |
| `applied_at` | DATETIME | No | `utcnow()` | When the application was created. Used for ordering. |
| `notes` | TEXT | Yes | `""` | Free-text notes (e.g. referral name, interview prep notes) |

### Indexes
- `INDEX ON user_id` — speeds up "list my applications"
- `COMPOSITE INDEX ON (user_id, status)` — speeds up status-filtered queries (e.g. `?status=interview`)

### Valid status values

```
draft       → Started but not yet submitted
applied     → Submitted (default)
interview   → Moved to interview stage
offer       → Received an offer
rejected    → Application was declined
```

### Relationships

| Relationship | Type | Target |
|-------------|------|--------|
| `user` | Many-to-one (back-ref) | `users.id` |

### Which APIs use it

| Endpoint | Operation | Why |
|----------|-----------|-----|
| `GET /api/applications` | SELECT | List all (optionally filtered by status) |
| `POST /api/applications` | INSERT | Create a new application record |
| `PUT /api/applications/{id}` | SELECT, UPDATE | Edit company, status, notes, score, etc. |
| `DELETE /api/applications/{id}` | SELECT, DELETE | Remove the record |

---

## Table: `qa_pairs`

**Purpose:** Stores question-and-answer pairs that the system has learned about the user — either generated by AI or saved after the user completed an autofill session. These are used in future `auto-map` calls to instantly populate form fields without re-querying the LLM.

Think of it as a personal answer bank: the app remembers what you previously answered for "Why do you want this job?" and reuses it.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No | auto-increment | Primary key |
| `user_id` | INTEGER | No | — | Foreign key → `users.id` |
| `question` | TEXT | No | — | The form field label or question text. Used as the lookup key. |
| `answer` | TEXT | No | — | The saved answer/value for that question. |
| `embedding` | JSON | Yes | `NULL` | Reserved for future vector similarity search (not yet used). |

### Indexes
- `INDEX ON user_id`

### Upsert behaviour

When answers are saved via `POST /api/ai/save-answers`, the backend performs an **upsert** per pair:
- If a `QAPair` with the same `user_id` + `question` already exists → **UPDATE** the `answer`.
- If none exists → **INSERT** a new row.

This means the answer bank grows over time and self-corrects — later answers overwrite earlier ones for the same question.

### Relationships

| Relationship | Type | Target |
|-------------|------|--------|
| `user` | Many-to-one (back-ref) | `users.id` |

### Which APIs use it

| Endpoint | Operation | Why |
|----------|-----------|-----|
| `GET /api/profile/saved-answers` | SELECT | List all Q&A pairs for the user |
| `PUT /api/profile/saved-answers/{id}` | SELECT, UPDATE | Edit an answer manually |
| `DELETE /api/profile/saved-answers/{id}` | SELECT, DELETE | Remove a saved answer |
| `POST /api/ai/auto-map` | SELECT | Load all saved answers to pre-fill form fields without LLM |
| `POST /api/ai/save-answers` | SELECT, UPDATE or INSERT | Upsert answers after an autofill session |

---

## Table: `email_logs`

**Purpose:** An audit log of every outbound email sent by the system. Used for debugging delivery failures and to support rate-limiting logic (preventing a single user from triggering hundreds of emails). A row is written for every email attempt, whether it succeeded or failed.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INTEGER | No | auto-increment | Primary key |
| `user_id` | INTEGER | Yes | `NULL` | Foreign key → `users.id`. `NULL` is allowed for emails sent before account creation completes. |
| `to_email` | VARCHAR(255) | No | — | Recipient email address |
| `subject` | VARCHAR(255) | No | — | Email subject line |
| `email_type` | VARCHAR(50) | No | — | Type of email. One of: `verification`, `password_reset` |
| `status` | VARCHAR(20) | No | — | Outcome. Either `sent` or `failed` |
| `error_message` | TEXT | Yes | `NULL` | If `status = "failed"`, the exception message from the Resend SDK |
| `sent_at` | DATETIME | No | `utcnow()` | When the send attempt occurred |

### Indexes
- `INDEX ON user_id`

### Relationships

| Relationship | Type | Target |
|-------------|------|--------|
| `user` | Many-to-one (back-ref) | `users.id` (nullable) |

> The `user_id` FK is nullable because an email log row is created even if the user lookup fails, so the audit trail is always complete.

### Which APIs use it

| Endpoint | Operation | Why |
|----------|-----------|-----|
| `POST /api/auth/register` | INSERT | Log verification email send result |
| `POST /api/auth/send-verification` | INSERT | Log resend attempt result |
| `POST /api/auth/forgot-password` | INSERT | Log password reset email send result |

---

## Migration History

Alembic tracks every schema change in `backend/alembic/versions/`. Migrations are applied in order and each has an `upgrade()` and `downgrade()` function.

| Migration ID | Description | Tables affected |
|-------------|-------------|----------------|
| `a1644f362892` | Initial schema — created all 6 tables | `users`, `profiles`, `resumes`, `applications`, `qa_pairs`, `email_logs` |
| `b2755g473903` | Added `drive_link` column to `resumes` | `resumes` |
| `c3866h584014` | Added `is_r2` column to `resumes` | `resumes` |

To run migrations on a fresh database:
```bash
cd backend
alembic upgrade head
```

To create a new migration after changing a model:
```bash
alembic revision --autogenerate -m "describe your change"
```

---

## Design Decisions

### Why JSON columns for skills, experience, and education?
These fields are always read and written as a complete unit — the app never needs to query "find all profiles where skills contains React". Using JSON columns keeps the schema simple (no `profile_skills` join table needed) at the cost of SQL-level introspection. If full-text or relational queries into these fields were ever needed, they could be normalized into separate tables.

### Why store R2 object keys instead of public URLs?
R2 objects are not publicly readable — they require authenticated access. Storing the **key** (e.g. `resumes/abc123_resume.pdf`) instead of a URL lets the backend generate signed or proxied URLs at download time, keeping files private to the owner.

### Why nullable `user_id` on `email_logs`?
The email is sometimes sent during registration before the user's DB `id` is confirmed. Making `user_id` nullable ensures the log row can always be written regardless of timing, giving a complete audit trail.

### Why a composite index on `(user_id, status)` for applications?
The most common application query is "give me all of this user's applications with status X". A composite index on both columns satisfies this query from the index alone without a full table scan.

---

## Quick Reference

| Table | Rows represent | Owner | Key columns |
|-------|---------------|-------|-------------|
| `users` | One account | — | `email`, `hashed_password`, `is_verified` |
| `profiles` | Professional profile | `users` | `skills`, `experience`, `education`, `summary` |
| `resumes` | One resume file or link | `users` | `filepath`, `is_r2`, `is_default`, `drive_link` |
| `applications` | One job application | `users` | `company`, `position`, `status`, `match_score` |
| `qa_pairs` | One saved Q&A pair | `users` | `question`, `answer` |
| `email_logs` | One email send attempt | `users` (nullable) | `email_type`, `status`, `error_message` |
