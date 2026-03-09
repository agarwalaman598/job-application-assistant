# Data Flow — JobAssist AI

This document traces exactly how data moves through the system for the five most important user actions — from the moment a user clicks a button in the browser, all the way to the database and back.

---

## How to read these diagrams

Each flow is broken into numbered steps. The actors involved are:

```
Browser              The user's React app running in their browser
  │
  │  HTTP (Axios)
  ▼
FastAPI (Backend)    The Python API server
  │
  ├─ DB              PostgreSQL / SQLite (via SQLAlchemy)
  ├─ R2              Cloudflare R2 object storage
  ├─ LLM             Groq / OpenAI language model API
  └─ Email           Resend transactional email API
```

---

## 1. User Signup

**User story:** A new visitor fills in the registration form and submits it.

### Step-by-step

```
Browser                  FastAPI                     DB              Email API
  │                         │                          │                  │
  │  1. User fills form      │                          │                  │
  │  (email, password,       │                          │                  │
  │   full_name) and         │                          │                  │
  │  clicks "Register"       │                          │                  │
  │                         │                          │                  │
  │──POST /api/auth/──────▶│                          │                  │
  │    register              │                          │                  │
  │    {email, password,     │                          │                  │
  │     full_name}           │                          │                  │
  │                         │ 2. Validate input         │                  │
  │                         │    - password ≥ 8 chars   │                  │
  │                         │    - valid email format   │                  │
  │                         │                          │                  │
  │                         │──SELECT users WHERE──────▶│                 │
  │                         │   email = ?               │                  │
  │                         │◀──── (null) ─────────────│                  │
  │                         │                          │                  │
  │                         │ 3. Hash password          │                  │
  │                         │    bcrypt.hashpw(pw)      │                  │
  │                         │                          │                  │
  │                         │ 4. Generate verification  │                  │
  │                         │    token (32-byte random) │                  │
  │                         │    expires = now + 24h    │                  │
  │                         │                          │                  │
  │                         │──INSERT INTO users────────▶│                │
  │                         │   (email, hashed_pw,      │                  │
  │                         │    full_name,             │                  │
  │                         │    is_verified=False,     │                  │
  │                         │    verification_token)    │                  │
  │                         │◀──── user.id = 42 ────────│                  │
  │                         │                          │                  │
  │                         │──INSERT INTO profiles─────▶│                │
  │                         │   (user_id=42, all empty) │                  │
  │                         │                          │                  │
  │                         │ 5. Send verification email│──POST resend ──▶│
  │                         │    to user's address      │    API           │
  │                         │                          │                  │
  │                         │──INSERT INTO email_logs───▶│                │
  │                         │   (user_id, status=sent)  │                  │
  │                         │                          │                  │
  │◀──── 201 ──────────────│                          │                  │
  │   {id, email,           │                          │                  │
  │    is_verified: false,  │                          │                  │
  │    email_sent: true}    │                          │                  │
  │                         │                          │                  │
  │ 6. Frontend shows:      │                          │                  │
  │   "Check your inbox!"   │                          │                  │
```

### What happens when the user clicks the link in the email

```
Browser                  FastAPI                     DB
  │                         │                          │
  │  User clicks link:      │                          │
  │  /verify-email?token=X  │                          │
  │                         │                          │
  │──GET /api/auth/─────────▶│                         │
  │   verify-email?token=X  │                          │
  │                         │──SELECT users WHERE──────▶│
  │                         │   verification_token = X  │
  │                         │◀──── user row ────────────│
  │                         │                          │
  │                         │  Check token not expired  │
  │                         │                          │
  │                         │──UPDATE users SET─────────▶│
  │                         │   is_verified = True      │
  │                         │   verification_token = NULL│
  │                         │                          │
  │◀──── 200 ──────────────│                          │
  │   {detail: "Email       │                          │
  │    verified!"}          │                          │
  │                         │                          │
  │ Frontend redirects      │                          │
  │ user to /login          │                          │
```

**Database tables touched:** `users` (SELECT, INSERT, UPDATE), `profiles` (INSERT), `email_logs` (INSERT)

---

## 2. User Login

**User story:** A registered, verified user enters their credentials and logs in.

### Step-by-step

```
Browser                  FastAPI                     DB
  │                         │                          │
  │  User fills login form  │                          │
  │  and clicks "Sign In"   │                          │
  │                         │                          │
  │──POST /api/auth/login──▶│                          │
  │   {email, password}     │                          │
  │                         │──SELECT users WHERE──────▶│
  │                         │   email = ?               │
  │                         │◀──── user row ────────────│
  │                         │                          │
  │                         │ 1. Verify password:       │
  │                         │   bcrypt.checkpw(         │
  │                         │     submitted_pw,         │
  │                         │     stored_hash)          │
  │                         │   → True / False          │
  │                         │                          │
  │                         │ 2. Check is_verified=True │
  │                         │   (403 if not verified)   │
  │                         │                          │
  │                         │ 3. Create JWT:            │
  │                         │   payload = {             │
  │                         │     sub: user_id,         │
  │                         │     email: ...,           │
  │                         │     exp: now + 24h        │
  │                         │   }                       │
  │                         │   signed with SECRET_KEY  │
  │                         │                          │
  │◀──── 200 ──────────────│                          │
  │   Set-Cookie:           │                          │
  │     access_token=<JWT>  │                          │
  │     httpOnly; Secure    │                          │
  │                         │                          │
  │   Body:                 │                          │
  │   {access_token: <JWT>, │                          │
  │    user: {id, email,    │                          │
  │           full_name}}   │                          │
  │                         │                          │
  │ 4. Frontend stores:     │                          │
  │   localStorage          │                          │
  │     .setItem("token",   │                          │
  │      <JWT>)             │                          │
  │   localStorage          │                          │
  │     .setItem("user",    │                          │
  │      {...})             │                          │
  │                         │                          │
  │ 5. Redirect to          │                          │
  │    /dashboard           │                          │
```

### How auth works on subsequent requests

After login, **every** API call made by the frontend automatically carries the token. This is handled once in `api.js` via an Axios interceptor — no per-page code required:

```
Browser (api.js interceptor)          FastAPI (auth.py)
  │                                       │
  │  1. Any API call triggered            │
  │                                       │
  │  2. Before sending, interceptor runs: │
  │     token = localStorage.getItem(     │
  │       "token")                        │
  │     headers["Authorization"] =        │
  │       "Bearer " + token               │
  │                                       │
  │──GET /api/profile ─────────────────▶ │
  │   Authorization: Bearer eyJhbGci...  │
  │                                       │
  │                          3. get_current_user() runs:
  │                             - reads cookie first
  │                             - falls back to header
  │                             - jwt.decode(token,
  │                                SECRET_KEY)
  │                             - extracts user_id
  │                             - SELECT users WHERE
  │                                id = user_id
  │                             → User object injected
  │                               into route handler
  │                                       │
  │◀──── protected response ─────────── │
```

If the token is missing or expired, FastAPI returns `401`. The Axios response interceptor catches this and redirects the browser to `/login`.

**Database tables touched:** `users` (SELECT ×2 — once for auth, once for route)

---

## 3. Main Product Feature — AI Resume Match Score

**User story:** The user pastes a job description and clicks "Analyze". The app scores how well their resume matches the job.

This is the most complex flow — it touches the database, file storage, and the external LLM.

### Step-by-step

```
Browser              FastAPI              DB              R2 Storage       LLM API
  │                     │                  │                  │                │
  │ User pastes JD      │                  │                  │                │
  │ and clicks Analyze  │                  │                  │                │
  │                     │                  │                  │                │
  │──POST /api/ai/─────▶│                  │                  │                │
  │    match            │                  │                  │                │
  │    {job_description}│                  │                  │                │
  │                     │                  │                  │                │
  │              1. Authenticate user      │                  │                │
  │               (decode JWT, load User)  │                  │                │
  │                     │                  │                  │                │
  │              2. Load profile           │                  │                │
  │                     │──SELECT profiles─▶│                 │                │
  │                     │   WHERE user_id  │                  │                │
  │                     │◀── profile row ──│                  │                │
  │                     │                  │                  │                │
  │              3. Find default resume    │                  │                │
  │                     │──SELECT resumes──▶│                 │                │
  │                     │   WHERE user_id  │                  │                │
  │                     │   AND is_default │                  │                │
  │                     │◀── resume row ───│                  │                │
  │                     │   (filepath,     │                  │                │
  │                     │    is_r2=True)   │                  │                │
  │                     │                  │                  │                │
  │              4. Download resume PDF    │                  │                │
  │                     │                  │                  │                │
  │                     │──────────────────────────GET key──▶│                │
  │                     │                  │  resumes/abc.pdf │                │
  │                     │◀─────────────────────── PDF bytes ─│                │
  │                     │                  │                  │                │
  │              5. Extract text from PDF  │                  │                │
  │                 PyPDF2.PdfReader       │                  │                │
  │                 → plain text string    │                  │                │
  │                 (capped at 3000 chars) │                  │                │
  │                     │                  │                  │                │
  │              6. Build LLM prompt:      │                  │                │
  │                 - User skills list     │                  │                │
  │                 - User summary         │                  │                │
  │                 - Resume text          │                  │                │
  │                 - Job description      │                  │                │
  │                     │                  │                  │                │
  │                     │─────────────────────────────────POST chat ─────────▶│
  │                     │                  │                  │  completions   │
  │                     │                  │                  │  (system +     │
  │                     │                  │                  │   user prompt) │
  │                     │                  │                  │                │
  │                     │◀────────────────────────────────── JSON response ───│
  │                     │                  │                  │  {match_score, │
  │                     │                  │                  │   matched_     │
  │                     │                  │                  │   skills, ...} │
  │                     │                  │                  │                │
  │              7. Parse + validate       │                  │                │
  │                 LLM JSON response      │                  │                │
  │                 → MatchResponse schema │                  │                │
  │                     │                  │                  │                │
  │◀──── 200 ──────────│                  │                  │                │
  │   {match_score: 78, │                  │                  │                │
  │    matched_skills:  │                  │                  │                │
  │      ["Python",...],│                  │                  │                │
  │    missing_skills:  │                  │                  │                │
  │      ["Docker",...],│                  │                  │                │
  │    breakdown: {...},│                  │                  │                │
  │    suggestions:[...]}                  │                  │                │
  │                     │                  │                  │                │
  │ 8. Frontend renders │                  │                  │                │
  │    MatchScoreGauge  │                  │                  │                │
  │    component with   │                  │                  │                │
  │    score + details  │                  │                  │                │
```

**Database tables touched:** `users` (SELECT), `profiles` (SELECT), `resumes` (SELECT)  
**External:** Cloudflare R2 (GET), LLM API (POST)

---

## 4. Data Saving — Uploading a Resume

**User story:** The user selects a PDF from their computer and clicks "Upload Resume".

```
Browser              FastAPI              DB              R2 Storage
  │                     │                  │                  │
  │ User picks a PDF    │                  │                  │
  │ from file picker    │                  │                  │
  │                     │                  │                  │
  │──POST /api/resumes/─▶│                 │                  │
  │    upload           │                  │                  │
  │    multipart/form   │                  │                  │
  │    data: file=<pdf> │                  │                  │
  │    Authorization:   │                  │                  │
  │    Bearer <token>   │                  │                  │
  │                     │                  │                  │
  │              1. Authenticate user      │                  │
  │                     │                  │                  │
  │              2. Validate file:         │                  │
  │                 - extension = .pdf     │                  │
  │                 - size ≤ 10 MB         │                  │
  │                     │                  │                  │
  │              3. Check R2 configured    │                  │
  │                 (env vars present)     │                  │
  │                     │                  │                  │
  │              4. Generate unique name:  │                  │
  │                 uuid4() + original     │                  │
  │                 filename              │                  │
  │                 key = "resumes/        │                  │
  │                   <uuid>_file.pdf"    │                  │
  │                     │                  │                  │
  │              5. Count existing resumes │                  │
  │                     │──SELECT COUNT────▶│                 │
  │                     │   resumes WHERE  │                  │
  │                     │   user_id = ?    │                  │
  │                     │◀── count: 0 ─────│                  │
  │                     │                  │                  │
  │              6. Upload to R2           │                  │
  │                     │─────────────────────────PUT object─▶│
  │                     │                  │  Key = key above │
  │                     │                  │  Body = PDF bytes│
  │                     │◀──────────────────────── OK ────────│
  │                     │                  │                  │
  │              7. Save DB record         │                  │
  │                     │──INSERT resumes──▶│                 │
  │                     │   user_id,        │                  │
  │                     │   filename,       │                  │
  │                     │   filepath = key, │                  │
  │                     │   is_r2 = True,   │                  │
  │                     │   is_default =    │                  │
  │                     │     (count == 0)  │                  │
  │                     │◀── resume row ────│                  │
  │                     │                  │                  │
  │◀──── 201 ──────────│                  │                  │
  │   {id, filename,    │                  │                  │
  │    is_default: true,│                  │                  │
  │    is_r2: true,     │                  │                  │
  │    has_file: true,  │                  │                  │
  │    uploaded_at: ...}│                  │                  │
  │                     │                  │                  │
  │ 8. Frontend adds    │                  │                  │
  │    new card to the  │                  │                  │
  │    resume list      │                  │                  │
```

**Database tables touched:** `users` (SELECT), `resumes` (SELECT for count, INSERT)  
**External:** Cloudflare R2 (PUT)

---

## 4b. Data Saving — Saving Autofill Answers

**User story:** After autofilling a job form, the user confirms the answers. The app saves them so they can be reused next time.

```
Browser              FastAPI              DB
  │                     │                  │
  │ User reviews the    │                  │
  │ mapped answers in   │                  │
  │ AutofillPage and    │                  │
  │ clicks "Save for    │                  │
  │ next time"          │                  │
  │                     │                  │
  │──POST /api/ai/─────▶│                  │
  │    save-answers     │                  │
  │  { fields: [        │                  │
  │    {label: "Name",  │                  │
  │     value: "Alice"},│                  │
  │    {label: "Why?",  │                  │
  │     value: "I ..."},│                  │
  │    ...              │                  │
  │  ] }                │                  │
  │                     │                  │
  │              1. Authenticate user      │
  │                     │                  │
  │              2. For each {label,value} │
  │                 pair:                  │
  │                     │                  │
  │                     │──SELECT qa_pairs─▶│
  │                     │   WHERE user_id  │
  │                     │   AND question   │
  │                     │   = label        │
  │                     │                  │
  │                     │  If EXISTS:      │
  │                     │──UPDATE qa_pairs─▶│
  │                     │   SET answer=val │
  │                     │                  │
  │                     │  If NOT EXISTS:  │
  │                     │──INSERT qa_pairs─▶│
  │                     │   (user_id,      │
  │                     │    question=lbl, │
  │                     │    answer=val)   │
  │                     │                  │
  │              3. Commit all changes in  │
  │                 one transaction        │
  │                     │                  │
  │◀──── 200 ──────────│                  │
  │  {saved_count: 2}   │                  │
```

**Database tables touched:** `qa_pairs` (SELECT, UPDATE or INSERT per pair)

---

## 5. Data Fetching — Loading the Applications Page

**User story:** The user navigates to `/applications`. The page loads and displays their job application tracker.

```
Browser (React)      FastAPI              DB
  │                     │                  │
  │ 1. User navigates   │                  │
  │    to /applications │                  │
  │                     │                  │
  │ 2. React Router     │                  │
  │    renders          │                  │
  │    ApplicationsPage │                  │
  │                     │                  │
  │ 3. Component mounts │                  │
  │    useEffect fires  │                  │
  │    api.get(         │                  │
  │     "/api/          │                  │
  │      applications") │                  │
  │                     │                  │
  │ 4. Axios interceptor│                  │
  │    attaches token:  │                  │
  │    Authorization:   │                  │
  │    Bearer <token>   │                  │
  │                     │                  │
  │──GET /api/──────────▶│                 │
  │    applications     │                  │
  │                     │                  │
  │              5. get_current_user()     │
  │                 decodes JWT →          │
  │                 user_id = 42           │
  │                     │                  │
  │              6. Query DB              │
  │                     │──SELECT * FROM───▶│
  │                     │   applications   │
  │                     │   WHERE user_id=42│
  │                     │   ORDER BY       │
  │                     │   applied_at DESC│
  │                     │◀── list of rows ─│
  │                     │                  │
  │              7. Serialize each row     │
  │                 through ApplicationOut │
  │                 Pydantic schema        │
  │                     │                  │
  │◀──── 200 ──────────│                  │
  │   [                 │                  │
  │     {id: 1,         │                  │
  │      company: "...",│                  │
  │      status: "...", │                  │
  │      match_score:..,│                  │
  │      ...},          │                  │
  │     ...             │                  │
  │   ]                 │                  │
  │                     │                  │
  │ 8. React sets state │                  │
  │    setApplications  │                  │
  │    (data)           │                  │
  │                     │                  │
  │ 9. Component re-    │                  │
  │    renders, showing │                  │
  │    a card for each  │                  │
  │    application with │                  │
  │    StatusBadge      │                  │
```

### Filtered fetch (e.g. "Show only Applied")

When the user picks a filter from the dropdown, the same flow runs with a query parameter appended:

```
Browser                 FastAPI                DB
  │                        │                    │
  │ User selects           │                    │
  │ "Applied" filter       │                    │
  │                        │                    │
  │──GET /api/applications─▶│                   │
  │    ?status=applied     │                    │
  │                        │                    │
  │                  Query param parsed         │
  │                  as Optional[str]           │
  │                        │                    │
  │                        │──SELECT * FROM─────▶│
  │                        │   applications     │
  │                        │   WHERE user_id=42 │
  │                        │   AND status=      │
  │                        │     'applied'      │
  │                        │   ORDER BY         │
  │                        │   applied_at DESC  │
  │                        │◀── filtered rows ──│
  │                        │                    │
  │◀──── 200 filtered ────│                    │
  │    list                │                    │
```

**Database tables touched:** `users` (SELECT), `applications` (SELECT)

---

## End-to-end Summary Table

| Action | Frontend trigger | API call | Backend steps | External calls | DB tables written | DB tables read |
|--------|-----------------|----------|---------------|----------------|------------------|----------------|
| Signup | Register form submit | `POST /api/auth/register` | Hash pw → insert user → insert profile → send email | Resend (email) | `users`, `profiles`, `email_logs` | `users` |
| Login | Login form submit | `POST /api/auth/login` | Verify pw → check verified → create JWT → set cookie | — | — | `users` |
| AI Match Score | Paste JD → Analyze | `POST /api/ai/match` | Load profile → load resume → download PDF → extract text → LLM call → parse response | R2 (GET), LLM API | — | `users`, `profiles`, `resumes` |
| Upload Resume | Pick PDF → Upload | `POST /api/resumes/upload` | Validate file → upload to R2 → insert resume row | R2 (PUT) | `resumes` | `users`, `resumes` |
| Save Answers | Confirm autofill → Save | `POST /api/ai/save-answers` | Upsert each label/value pair | — | `qa_pairs` | `users`, `qa_pairs` |
| Fetch Applications | Navigate to /applications | `GET /api/applications` | Decode JWT → query applications | — | — | `users`, `applications` |

---

## Key Patterns to Notice

### 1. Every protected request follows the same auth path
Every request to a protected endpoint passes through `get_current_user()` in `auth.py` before any business logic runs. This is a FastAPI dependency — it's declared once and automatically injected.

```
Request arrives
      │
      ▼
get_current_user()
      │
      ├── Read cookie OR Authorization header
      ├── jwt.decode(token, SECRET_KEY)
      ├── Extract user_id from payload
      └── SELECT users WHERE id = user_id
            │
            ▼
      User object passed to route handler
```

### 2. AI features always need three things
Every AI endpoint follows the same data-gathering pattern before calling the LLM:

```
1. Load profile     → skills, summary, contact info
2. Load resume row  → find is_default = True
3. Download PDF     → from R2 (if is_r2=True)
                    → from local disk (fallback)
4. Extract text     → PyPDF2.PdfReader
5. Combine context  → build LLM prompt
6. Call LLM         → parse structured JSON response
```

### 3. The frontend never talks to the database directly
All data access goes through the FastAPI backend. The browser only knows about JSON — it never sees SQL, file paths, or R2 keys.

### 4. Optimistic vs. confirmed UI updates
The frontend waits for the backend's `200` response before updating the UI. There is no optimistic updating — if the server returns an error, the UI does not change. Error messages from the backend's `{ "detail": "..." }` field are surfaced directly to the user via the `getErrorMessage()` helper in `api.js`.
