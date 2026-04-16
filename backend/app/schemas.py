from pydantic import BaseModel, field_validator, model_validator, EmailStr
from typing import Optional, List, Literal
from datetime import datetime

from app.utils import sanitize_text


def normalize_tags(raw_tags) -> List[str]:
    """Normalize user-supplied tags into a stable, deduplicated list."""
    if not raw_tags:
        return []
    seen = set()
    normalized: List[str] = []
    for tag in raw_tags:
        if not isinstance(tag, str):
            continue
        clean = sanitize_text(tag)
        clean = clean[:30].strip()
        if not clean:
            continue
        key = clean.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(clean)
        if len(normalized) >= 20:
            break
    return normalized


# ── Auth ──────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

    @field_validator('email', 'full_name', mode='before')
    @classmethod
    def _sanitize(cls, v):
        return sanitize_text(v) if isinstance(v, str) else v


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserSession(BaseModel):
    id: int
    email: str
    full_name: str


class LoginResponse(BaseModel):
    message: str = "Logged in"
    user: UserSession


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Profile ───────────────────────────────────────────
class ExperienceItem(BaseModel):
    title: str = ""
    company: str = ""
    duration: str = ""
    description: str = ""
    # legacy fields kept for backward compat
    start_date: str = ""
    end_date: str = ""


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""
    major: str = ""
    start_year: str = ""
    end_year: str = ""
    # legacy fields kept for backward compat
    year: str = ""
    gpa: str = ""
    gpa_scale: str = ""


class ContactFieldItem(BaseModel):
    id: Optional[int] = None
    label: str = ""
    value: str = ""
    type: Literal['text', 'email', 'phone', 'url'] = 'text'

    @field_validator('label', 'value', mode='before')
    @classmethod
    def _sanitize(cls, v):
        return sanitize_text(v) if isinstance(v, str) else v


class ProfileUpdate(BaseModel):
    phone: Optional[str] = ""
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    website: Optional[str] = ""
    contact_fields: Optional[List[ContactFieldItem]] = []
    skills: Optional[List[str]] = []
    experience: Optional[List[ExperienceItem]] = []
    education: Optional[List[EducationItem]] = []
    summary: Optional[str] = ""

    @field_validator('phone', 'linkedin', 'github', 'website', 'summary', mode='before')
    @classmethod
    def _sanitize(cls, v):
        return sanitize_text(v) if isinstance(v, str) else v

    @field_validator('skills', mode='before')
    @classmethod
    def _normalize_skills(cls, v):
        if not v:
            return []
        items = v if isinstance(v, list) else [v]
        out = []
        seen = set()
        for item in items:
            if not isinstance(item, str):
                continue
            # Support clients sending comma-separated skills in a single value
            parts = item.split(',') if ',' in item else [item]
            for part in parts:
                clean = sanitize_text(part).strip()
                if not clean:
                    continue
                key = clean.casefold()
                if key in seen:
                    continue
                seen.add(key)
                out.append(clean)
        return out


class ProfileOut(BaseModel):
    id: int
    user_id: int
    phone: str
    linkedin: str
    github: str
    website: str
    contact_fields: list
    skills: List[str]
    experience: list
    education: list
    summary: str


class SavedAnswerUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None

    @field_validator('question', 'answer', mode='before')
    @classmethod
    def _sanitize(cls, v):
        return sanitize_text(v) if isinstance(v, str) else v

    class Config:
        from_attributes = True


# ── Resume ────────────────────────────────────────────
class ResumeOut(BaseModel):
    id: int
    filename: str
    is_default: bool
    is_r2: bool = False
    drive_link: Optional[str] = None
    tags: List[str] = []
    uploaded_at: datetime
    has_file: bool = False

    @model_validator(mode='before')
    @classmethod
    def _compute_has_file(cls, v):
        """Populate has_file from the ORM filepath attribute (not exposed on output)."""
        if not isinstance(v, dict):
            filepath = getattr(v, 'filepath', None) or ''
            return {
                'id': v.id,
                'filename': v.filename,
                'is_default': v.is_default,
                'is_r2': getattr(v, 'is_r2', False),
                'drive_link': getattr(v, 'drive_link', None),
                'tags': normalize_tags(getattr(v, 'tags', []) or []),
                'uploaded_at': v.uploaded_at,
                'has_file': bool(filepath),
            }
        v['tags'] = normalize_tags(v.get('tags', []))
        v.setdefault('has_file', bool(v.get('filepath', '')))
        return v

    class Config:
        from_attributes = True


class JobSearchRequest(BaseModel):
    query: str
    location: Optional[str] = ""
    resume_ids: List[int]
    page: int = 1
    num_pages: int = 1
    date_posted: str = "week"

    @field_validator('query', mode='before')
    @classmethod
    def _sanitize_query(cls, v):
        return sanitize_text(v) if isinstance(v, str) else v

    @field_validator('location', mode='before')
    @classmethod
    def _sanitize_location(cls, v):
        return sanitize_text(v) if isinstance(v, str) else v

    @field_validator('resume_ids')
    @classmethod
    def _validate_resume_ids(cls, v):
        unique_ids = []
        seen = set()
        for item in v or []:
            if not isinstance(item, int) or item <= 0:
                continue
            if item in seen:
                continue
            seen.add(item)
            unique_ids.append(item)
        if not unique_ids:
            raise ValueError("Select at least one resume")
        return unique_ids

    @field_validator('page', 'num_pages')
    @classmethod
    def _validate_paging(cls, v):
        if v < 1:
            raise ValueError("Paging values must be >= 1")
        return min(v, 3)

    @field_validator('date_posted')
    @classmethod
    def _validate_date_posted(cls, v):
        allowed = {"all", "today", "3days", "week", "month"}
        value = (v or "week").strip().lower()
        if value not in allowed:
            raise ValueError("date_posted must be one of: all, today, 3days, week, month")
        return value


class JobSearchItem(BaseModel):
    job_id: str
    title: str
    company: str
    location: str
    apply_link: str
    score: int
    tags: List[str]
    matched_resumes: List[str]
    posted_at: Optional[str] = None


class JobSearchResponse(BaseModel):
    query: str
    total_jobs: int
    jobs: List[JobSearchItem]


# ── Application ──────────────────────────────────────
VALID_STATUSES = {"draft", "applied", "interview", "offer", "rejected"}
VALID_CONTACT_TYPES = {"hr", "recruiter", "interviewer", "referral", "other"}


class ApplicationCreate(BaseModel):
    resume_id: Optional[int] = None
    company: str
    position: str
    url: Optional[str] = ""
    status: Optional[str] = "applied"
    match_score: Optional[float] = None
    notes: Optional[str] = ""

    @field_validator('company', 'position', 'url', 'notes', mode='before')
    @classmethod
    def _sanitize(cls, v):
        return sanitize_text(v) if isinstance(v, str) else v

    @field_validator('status', mode='before')
    @classmethod
    def _validate_status(cls, v):
        if v and v not in VALID_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}")
        return v


class ApplicationUpdate(BaseModel):
    resume_id: Optional[int] = None
    company: Optional[str] = None
    position: Optional[str] = None
    url: Optional[str] = None
    status: Optional[str] = None
    match_score: Optional[float] = None
    notes: Optional[str] = None

    @field_validator('company', 'position', 'url', 'notes', mode='before')
    @classmethod
    def _sanitize(cls, v):
        return sanitize_text(v) if isinstance(v, str) else v

    @field_validator('status', mode='before')
    @classmethod
    def _validate_status(cls, v):
        if v and v not in VALID_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}")
        return v


class ApplicationOut(BaseModel):
    id: int
    resume_id: Optional[int] = None
    resume_filename: Optional[str] = None
    resume_drive_link: Optional[str] = None
    company: str
    position: str
    url: str
    status: str
    match_score: Optional[float]
    applied_at: datetime
    notes: str

    @model_validator(mode='before')
    @classmethod
    def _populate_resume_info(cls, v):
        if isinstance(v, dict):
            return v
        resume = getattr(v, 'resume', None)
        return {
            'id': v.id,
            'resume_id': getattr(v, 'resume_id', None),
            'resume_filename': getattr(resume, 'filename', None) if resume else None,
            'resume_drive_link': getattr(resume, 'drive_link', None) if resume else None,
            'company': v.company,
            'position': v.position,
            'url': v.url,
            'status': v.status,
            'match_score': v.match_score,
            'applied_at': v.applied_at,
            'notes': v.notes,
        }

    class Config:
        from_attributes = True


# ── Contacts ─────────────────────────────────────────
class ContactApplicationRef(BaseModel):
    id: int
    company: str
    position: str
    status: str


class ContactCreate(BaseModel):
    full_name: str
    contact_type: str = "recruiter"
    company: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    linkedin: Optional[str] = ""
    notes: Optional[str] = ""
    application_ids: Optional[List[int]] = []

    @field_validator('full_name', 'company', 'email', 'phone', 'linkedin', 'notes', mode='before')
    @classmethod
    def _sanitize(cls, v):
        return sanitize_text(v) if isinstance(v, str) else v

    @field_validator('contact_type', mode='before')
    @classmethod
    def _validate_type(cls, v):
        if not v:
            return "recruiter"
        clean = sanitize_text(v).lower()
        if clean not in VALID_CONTACT_TYPES:
            raise ValueError(f"Invalid contact_type. Must be one of: {', '.join(sorted(VALID_CONTACT_TYPES))}")
        return clean


class ContactUpdate(BaseModel):
    full_name: Optional[str] = None
    contact_type: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    notes: Optional[str] = None
    application_ids: Optional[List[int]] = None

    @field_validator('full_name', 'company', 'email', 'phone', 'linkedin', 'notes', mode='before')
    @classmethod
    def _sanitize(cls, v):
        return sanitize_text(v) if isinstance(v, str) else v

    @field_validator('contact_type', mode='before')
    @classmethod
    def _validate_type(cls, v):
        if v is None:
            return v
        clean = sanitize_text(v).lower()
        if clean not in VALID_CONTACT_TYPES:
            raise ValueError(f"Invalid contact_type. Must be one of: {', '.join(sorted(VALID_CONTACT_TYPES))}")
        return clean


class ContactOut(BaseModel):
    id: int
    full_name: str
    contact_type: str
    company: str
    email: str
    phone: str
    linkedin: str
    notes: str
    created_at: datetime
    updated_at: datetime
    application_ids: List[int] = []
    applications: List[ContactApplicationRef] = []

    @model_validator(mode='before')
    @classmethod
    def _populate_applications(cls, v):
        if isinstance(v, dict):
            return v

        apps = getattr(v, 'applications', []) or []
        return {
            'id': v.id,
            'full_name': v.full_name,
            'contact_type': v.contact_type,
            'company': v.company or '',
            'email': v.email or '',
            'phone': v.phone or '',
            'linkedin': v.linkedin or '',
            'notes': v.notes or '',
            'created_at': v.created_at,
            'updated_at': v.updated_at,
            'application_ids': [a.id for a in apps],
            'applications': [
                {
                    'id': a.id,
                    'company': a.company,
                    'position': a.position,
                    'status': a.status,
                }
                for a in apps
            ],
        }

    class Config:
        from_attributes = True


# ── AI ────────────────────────────────────────────────
class MatchRequest(BaseModel):
    job_description: str


class ScoreBreakdown(BaseModel):
    keyword_score: float
    skills_score: float
    experience_score: float
    education_score: float


class MatchResponse(BaseModel):
    match_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    breakdown: Optional[ScoreBreakdown] = None
    matched_keywords: Optional[List[str]] = []
    missing_keywords: Optional[List[str]] = []
    suggestions: Optional[List[str]] = []
    reasoning: Optional[str] = ""


class GenerateAnswerRequest(BaseModel):
    question: str
    job_description: Optional[str] = ""


class GenerateAnswerResponse(BaseModel):
    answer: str


class AnalyzeJDRequest(BaseModel):
    job_description: str


class AnalyzeJDResponse(BaseModel):
    title: str
    company: str
    required_skills: List[str]
    nice_to_have_skills: List[str]
    experience_level: str
    summary: str
    key_responsibilities: Optional[List[str]] = []
    resume_fit: Optional[str] = ""
    resume_gaps: Optional[List[str]] = []
    resume_strengths: Optional[List[str]] = []


# ── Autofill ─────────────────────────────────────────
class DetectFieldsRequest(BaseModel):
    url: str


class FormField(BaseModel):
    field_id: str
    label: str
    field_type: str  # text, radio, dropdown, checkbox, file
    options: Optional[List[str]] = []


class DetectFieldsResponse(BaseModel):
    platform: str
    fields: List[FormField]
    form_url: Optional[str] = ""


class FillFormRequest(BaseModel):
    url: str
    field_map: dict  # field_id -> value


class FillFormResponse(BaseModel):
    success: bool
    filled_count: int
    errors: List[str]
    prefilled_url: Optional[str] = None


# ── AI Router Request Bodies ──────────────────────────
class AutoMapRequest(BaseModel):
    """Typed request body for /ai/auto-map."""
    fields: List[FormField] = []


class SaveAnswersFieldItem(BaseModel):
    label: str
    value: str


class SaveAnswersRequest(BaseModel):
    """Typed request body for /ai/save-answers."""
    fields: List[SaveAnswersFieldItem] = []
