from pydantic import BaseModel, field_validator, model_validator, EmailStr
from typing import Optional, List
from datetime import datetime

from app.utils import sanitize_text


# ── Auth ──────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
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


class ProfileUpdate(BaseModel):
    phone: Optional[str] = ""
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    website: Optional[str] = ""
    skills: Optional[List[str]] = []
    experience: Optional[List[ExperienceItem]] = []
    education: Optional[List[EducationItem]] = []
    summary: Optional[str] = ""

    @field_validator('phone', 'linkedin', 'github', 'website', 'summary', mode='before')
    @classmethod
    def _sanitize(cls, v):
        return sanitize_text(v) if isinstance(v, str) else v


class ProfileOut(BaseModel):
    id: int
    user_id: int
    phone: str
    linkedin: str
    github: str
    website: str
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
                'uploaded_at': v.uploaded_at,
                'has_file': bool(filepath),
            }
        v.setdefault('has_file', bool(v.get('filepath', '')))
        return v

    class Config:
        from_attributes = True


# ── Application ──────────────────────────────────────
VALID_STATUSES = {"draft", "applied", "interview", "offer", "rejected"}


class ApplicationCreate(BaseModel):
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
    company: str
    position: str
    url: str
    status: str
    match_score: Optional[float]
    applied_at: datetime
    notes: str

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
