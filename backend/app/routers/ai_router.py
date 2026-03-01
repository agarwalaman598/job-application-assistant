import logging
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
    result = await detect_fields(payload.url)
    return DetectFieldsResponse(**result)


@router.post("/auto-map")
def auto_map(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    fields = payload.get("fields", [])
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
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save filled form field values for future auto-mapping."""
    fields = payload.get("fields", [])  # [{label, value}]
    saved_count = 0

    for item in fields:
        label = item.get("label", "").strip()
        value = item.get("value", "").strip()
        if not label or not value:
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
    return {"saved_count": saved_count}


@router.post("/fill-form", response_model=FillFormResponse)
async def fill_form_endpoint(payload: FillFormRequest, current_user: User = Depends(get_current_user)):
    result = await fill_form(payload.url, payload.field_map)
    return FillFormResponse(**result)
