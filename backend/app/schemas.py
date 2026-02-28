from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str


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


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Profile ───────────────────────────────────────────
class ExperienceItem(BaseModel):
    title: str = ""
    company: str = ""
    start_date: str = ""
    end_date: str = ""
    description: str = ""


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""
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

    class Config:
        from_attributes = True


# ── Resume ────────────────────────────────────────────
class ResumeOut(BaseModel):
    id: int
    filename: str
    is_default: bool
    drive_link: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ── Application ──────────────────────────────────────
class ApplicationCreate(BaseModel):
    company: str
    position: str
    url: Optional[str] = ""
    status: Optional[str] = "applied"
    match_score: Optional[float] = None
    notes: Optional[str] = ""


class ApplicationUpdate(BaseModel):
    company: Optional[str] = None
    position: Optional[str] = None
    url: Optional[str] = None
    status: Optional[str] = None
    match_score: Optional[float] = None
    notes: Optional[str] = None


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


class MatchResponse(BaseModel):
    match_score: float
    matched_skills: List[str]
    missing_skills: List[str]


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
