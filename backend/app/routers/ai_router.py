import logging
import re
from urllib.parse import urlsplit
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Profile, QAPair, Resume
from app.schemas import (
    MatchRequest, MatchResponse, ScoreBreakdown,
    GenerateAnswerRequest, GenerateAnswerResponse,
    AnalyzeJDRequest, AnalyzeJDResponse,
    DetectFieldsRequest, DetectFieldsResponse,
    FillFormRequest, FillFormResponse,
    AutoMapRequest, SaveAnswersRequest,
)
from app.auth import get_current_user
from app.services.ai_service import compute_match_score, generate_answer, parse_job_description, auto_map_fields
from app.services.autofill_service import detect_fields, fill_form

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI & Automation"])


def _get_default_resume_text(user_id: int, db: Session) -> str:
    """Extract text from the user's default resume PDF (local or R2)."""
    from app.services import r2_service
    import os

    resume = db.query(Resume).filter(
        Resume.user_id == user_id,
        Resume.is_default == True,
    ).first()

    if not resume or not resume.filepath:
        return ""

    try:
        if resume.is_r2:
            # Download from Cloudflare R2 and extract text in-memory
            return r2_service.extract_pdf_text_from_r2(resume.filepath)
        else:
            # Local file (old uploads)
            if not os.path.exists(resume.filepath):
                logger.warning(f"[AI] Resume file not found locally: {resume.filepath}")
                return ""
            from PyPDF2 import PdfReader
            reader = PdfReader(resume.filepath)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            text = text.strip()
            if len(text) > 3000:
                text = text[:3000] + "..."
            logger.info(f"[AI] Resume text extracted: {len(text)} chars from {resume.filename}")
            return text
    except Exception as e:
        logger.error(f"[AI] Failed to extract resume text: {e}")
        return ""


@router.post("/match", response_model=MatchResponse)
def match_skills(
    payload: MatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please complete your profile first.")

    resume_text = _get_default_resume_text(current_user.id, db)

    result = compute_match_score(
        user_skills=profile.skills or [],
        user_summary=profile.summary or "",
        jd_text=payload.job_description,
        resume_text=resume_text,
    )
    # Wrap breakdown dict in ScoreBreakdown model if present
    if result.get("breakdown"):
        result["breakdown"] = ScoreBreakdown(**result["breakdown"])
    return MatchResponse(**result)


@router.post("/generate-answer", response_model=GenerateAnswerResponse)
def gen_answer(
    payload: GenerateAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    resume_text = _get_default_resume_text(current_user.id, db)

    answer = generate_answer(
        question=payload.question,
        user_summary=profile.summary or "",
        user_skills=profile.skills or [],
        jd_text=payload.job_description,
        resume_text=resume_text,
    )
    return GenerateAnswerResponse(answer=answer)


@router.post("/analyze-jd", response_model=AnalyzeJDResponse)
def analyze_jd(
    payload: AnalyzeJDRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume_text = _get_default_resume_text(current_user.id, db)
    result = parse_job_description(payload.job_description, resume_text=resume_text)
    return AnalyzeJDResponse(**result)


@router.post("/detect-fields", response_model=DetectFieldsResponse)
async def detect_form_fields(payload: DetectFieldsRequest, current_user: User = Depends(get_current_user)):
    try:
        result = await detect_fields(payload.url)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    if not result.get("fields"):
        raise HTTPException(
            status_code=422,
            detail="No form fields detected. The form may require login, use JavaScript rendering, or is not a supported form type (Google Forms, MS Forms, Typeform, JotForm).",
        )
    return DetectFieldsResponse(**result)


@router.post("/auto-map")
def auto_map(
    payload: AutoMapRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    fields = [f.model_dump() for f in payload.fields]
    # Get default resume for drive_link
    default_resume = db.query(Resume).filter(
        Resume.user_id == current_user.id,
        Resume.is_default == True,
    ).first()

    profile_data = {
        "summary": profile.summary or "",
        "phone": profile.phone or "",
        "linkedin": profile.linkedin or "",
        "github": profile.github or "",
        "website": profile.website or "",
        "contact_fields": profile.contact_fields or [],
        "skills": profile.skills or [],
        "experience": profile.experience or [],
        "education": profile.education or [],
        "email": current_user.email,
        "full_name": current_user.full_name,
    }

    if default_resume and default_resume.drive_link:
        profile_data["resume_link"] = default_resume.drive_link

    # Load previously saved answers for this user
    saved_pairs = db.query(QAPair).filter(QAPair.user_id == current_user.id).all()
    saved_answers = {pair.question: pair.answer for pair in saved_pairs}

    # Get resume text for additional context
    resume_text = _get_default_resume_text(current_user.id, db)

    result = auto_map_fields(fields, profile_data, saved_answers, resume_text=resume_text)
    result["saved_answers_count"] = len(saved_answers)
    return result


@router.post("/save-answers")
def save_answers(
    payload: SaveAnswersRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save filled form field values for future auto-mapping.
    Skip saving if the answer is already present in profile or resume data.
    """
    # Fetch user's profile and default resume
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    default_resume = db.query(Resume).filter(
        Resume.user_id == current_user.id,
        Resume.is_default == True,
    ).first()
    
    def _norm_text(value: str) -> str:
        return re.sub(r"\s+", " ", str(value or "").strip().lower())

    def _norm_email(value: str) -> str:
        return _norm_text(value)

    def _norm_phone(value: str) -> str:
        return "".join(ch for ch in str(value or "") if ch.isdigit())

    def _norm_url(value: str) -> str:
        raw = str(value or "").strip()
        if not raw:
            return ""
        parsed = urlsplit(raw)
        # Handle URLs provided without scheme
        if not parsed.netloc and parsed.path:
            parsed = urlsplit("https://" + raw)
        netloc = parsed.netloc.lower().removeprefix("www.")
        path = parsed.path.rstrip("/")
        return f"{netloc}{path}" if netloc else _norm_text(raw)

    def _norm_number(value: str) -> str:
        text = _norm_text(value).rstrip("%").strip()
        if re.fullmatch(r"\d+(\.\d+)?", text):
            return text
        return ""

    def _same_value(left: str, right: str) -> bool:
        lt = _norm_text(left)
        rt = _norm_text(right)
        if not lt or not rt:
            return False
        if lt == rt:
            return True
        ln = _norm_number(lt)
        rn = _norm_number(rt)
        return bool(ln and rn and ln == rn)

    def _infer_bucket(label: str) -> str:
        l = _norm_text(label)
        if any(k in l for k in ["resume", "cv", "drive link", "resume link", "updated resume"]):
            return "resume_link"
        if "email" in l:
            return "contact_email"
        if any(k in l for k in ["phone", "mobile", "whatsapp", "contact number"]):
            return "contact_phone"
        if "linkedin" in l:
            return "contact_linkedin"
        if "github" in l:
            return "contact_github"
        if any(k in l for k in ["website", "portfolio"]):
            return "contact_website"
        if any(k in l for k in ["skill", "tech stack", "technology", "tools", "programming language"]):
            return "skills"
        if any(k in l for k in [
            "10th", "12th", "diploma", "graduation", "degree", "branch", "cgpa", "gpa", "percentage",
            "college", "school", "university", "yop", "year of passing", "education"
        ]):
            return "education"
        if any(k in l for k in ["experience", "current company", "previous company", "internship", "designation", "role", "title"]):
            return "experience"
        if any(k in l for k in ["summary", "about", "objective", "profile"]):
            return "summary"
        return "unknown"

    def _flatten_dict_values(items) -> list[str]:
        values = []
        for item in items or []:
            if isinstance(item, dict):
                for val in item.values():
                    if val is not None and str(val).strip():
                        values.append(str(val))
        return values

    def _should_skip(label: str, value: str) -> tuple[bool, str]:
        bucket = _infer_bucket(label)

        # Unknown labels are preserved to avoid accidental data loss.
        if bucket == "unknown":
            return False, "unknown-label"

        if bucket == "resume_link":
            if default_resume and default_resume.drive_link and _norm_url(value) == _norm_url(default_resume.drive_link):
                return True, "matches-default-resume-link"
            return False, "resume-link-not-matched"

        if not profile:
            return False, "profile-not-found"

        if bucket == "contact_email":
            return _norm_email(value) == _norm_email(current_user.email), "matches-user-email"

        if bucket == "contact_phone":
            phone_match = bool(_norm_phone(value) and _norm_phone(value) == _norm_phone(profile.phone or ""))
            return phone_match, "matches-profile-phone"

        if bucket == "contact_linkedin":
            link_match = bool(_norm_url(value) and _norm_url(value) == _norm_url(profile.linkedin or ""))
            return link_match, "matches-profile-linkedin"

        if bucket == "contact_github":
            github_match = bool(_norm_url(value) and _norm_url(value) == _norm_url(profile.github or ""))
            return github_match, "matches-profile-github"

        if bucket == "contact_website":
            website_match = bool(_norm_url(value) and _norm_url(value) == _norm_url(profile.website or ""))
            return website_match, "matches-profile-website"

        if bucket == "skills":
            for skill in profile.skills or []:
                if _same_value(value, str(skill)):
                    return True, "matches-profile-skill"
            return False, "skill-not-matched"

        if bucket == "education":
            for edu_value in _flatten_dict_values(profile.education):
                if _same_value(value, edu_value):
                    return True, "matches-profile-education"
            return False, "education-not-matched"

        if bucket == "experience":
            for exp_value in _flatten_dict_values(profile.experience):
                if _same_value(value, exp_value):
                    return True, "matches-profile-experience"
            return False, "experience-not-matched"

        if bucket == "summary":
            if profile.summary and _same_value(value, profile.summary):
                return True, "matches-profile-summary"
            return False, "summary-not-matched"

        return False, "no-rule"
    
    saved_count = 0
    skipped_count = 0

    for item in payload.fields:
        label = item.label.strip()
        value = item.value.strip()
        if not label or not value:
            continue

        # Skip only when label intent and normalized value match existing profile/resume data.
        should_skip, reason = _should_skip(label, value)
        if should_skip:
            skipped_count += 1
            logger.info(f"[Save Answers] Skipping '{label}' — {reason}")
            continue

        # Update existing or create new
        existing = db.query(QAPair).filter(
            QAPair.user_id == current_user.id,
            QAPair.question == label,
        ).first()

        if existing:
            existing.answer = value
        else:
            db.add(QAPair(user_id=current_user.id, question=label, answer=value))
        saved_count += 1

    db.commit()
    return {"saved_count": saved_count, "skipped_count": skipped_count}


@router.post("/fill-form", response_model=FillFormResponse)
async def fill_form_endpoint(payload: FillFormRequest, current_user: User = Depends(get_current_user)):
    result = await fill_form(payload.url, payload.field_map)
    return FillFormResponse(**result)
