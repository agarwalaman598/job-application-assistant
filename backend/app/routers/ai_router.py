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
    ProfileOut,
    ProfileImportPreviewRequest, ProfileImportPreviewResponse,
    ProfileImportDraft, ProfileImportDiffItem,
)
from app.auth import get_current_user
from app.services.ai_service import (
    compute_match_score,
    generate_answer,
    parse_job_description,
    auto_map_fields,
    extract_profile_import_draft,
)
from app.services.autofill_service import detect_fields, fill_form

logger = logging.getLogger(__name__)


def _clip_text_preserve_ends(text: str, max_chars: int) -> str:
    text = str(text or "").strip()
    if len(text) <= max_chars:
        return text
    if max_chars <= 32:
        return text[:max_chars]

    marker = "\n\n...[middle content omitted for preview]...\n\n"
    head_len = int(max_chars * 0.62)
    tail_len = max_chars - head_len - len(marker)
    if tail_len < 24:
        tail_len = 24
        head_len = max(0, max_chars - tail_len - len(marker))

    return f"{text[:head_len].rstrip()}{marker}{text[-tail_len:].lstrip()}"

router = APIRouter(prefix="/api/ai", tags=["AI & Automation"])


def _compose_text_with_links(text: str, links: list[str], max_chars: int) -> str:
    unique_links = [str(link).strip() for link in dict.fromkeys(links or []) if str(link).strip()]
    link_block = "\n".join(unique_links)
    text = str(text or "").strip()

    if not link_block:
        return _clip_text_preserve_ends(text, max_chars)

    suffix = f"\n\nLinks:\n{link_block}" if text else f"Links:\n{link_block}"
    if len(suffix) >= max_chars:
        return suffix[-max_chars:]

    allowed_text_length = max_chars - len(suffix)
    if len(text) > allowed_text_length:
        text = _clip_text_preserve_ends(text, allowed_text_length)
    return (text + suffix).strip()


def _profile_snapshot(profile: Profile | None, current_user: User) -> dict:
    contact_fields = profile.contact_fields if profile and profile.contact_fields else []
    if not contact_fields:
        seeded_fields = [
            {"id": 1, "label": "Phone", "value": (profile.phone if profile else "") or "", "type": "phone"},
            {"id": 2, "label": "LinkedIn", "value": (profile.linkedin if profile else "") or "", "type": "url"},
            {"id": 3, "label": "GitHub", "value": (profile.github if profile else "") or "", "type": "url"},
            {"id": 4, "label": "Website", "value": (profile.website if profile else "") or "", "type": "url"},
            {"id": 5, "label": "Email", "value": current_user.email or "", "type": "email"},
        ]
        contact_fields = [field for field in seeded_fields if field["value"]]

    return {
        "id": profile.id if profile else 0,
        "user_id": profile.user_id if profile else current_user.id,
        "phone": profile.phone if profile else "",
        "linkedin": profile.linkedin if profile else "",
        "github": profile.github if profile else "",
        "website": profile.website if profile else "",
        "contact_fields": contact_fields,
        "skills": profile.skills if profile else [],
        "experience": profile.experience if profile else [],
        "education": profile.education if profile else [],
        "summary": profile.summary if profile else "",
    }


def _normalize_contact_value(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _has_real_profile_data(profile: Profile | None) -> bool:
    if not profile:
        return False
    fields = [profile.summary, profile.phone, profile.linkedin, profile.github, profile.website]
    if any(_normalize_contact_value(value) for value in fields):
        return True
    if profile.skills or profile.experience or profile.education:
        return True
    for field in profile.contact_fields or []:
        label = _normalize_contact_value(field.get("label", "")).casefold()
        value = _normalize_contact_value(field.get("value", ""))
        if value and label not in {"email"}:
            return True
    return False


def _normalize_url(value: str) -> str:
    raw = _normalize_contact_value(value)
    if not raw:
        return ""
    parsed = urlsplit(raw)
    if not parsed.netloc and parsed.path:
        parsed = urlsplit("https://" + raw)
    netloc = parsed.netloc.lower().removeprefix("www.")
    path = parsed.path.rstrip("/")
    return f"{netloc}{path}" if netloc else raw.casefold()


def _normalize_phone(value: str) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _build_import_contact_fields(current_profile: Profile | None, resume_draft: dict, current_user: User) -> list[dict]:
    existing_fields = list((current_profile.contact_fields or []) if current_profile else [])
    extracted_fields = list(resume_draft.get("contact_fields", []) or [])
    custom_fields = [
        field for field in existing_fields
        if _normalize_contact_value(field.get("label", "")).casefold() not in {"phone", "linkedin", "github", "website", "email"}
    ]

    combined_fields = []
    seen = set()
    for field in extracted_fields + custom_fields:
        if not isinstance(field, dict):
            continue
        label = _normalize_contact_value(field.get("label", "")) or "Custom Field"
        value = _normalize_contact_value(field.get("value", ""))
        field_type = _normalize_contact_value(field.get("type", "text")).casefold() or "text"
        if not value:
            continue
        key = (label.casefold(), _normalize_url(value) if field_type == "url" else value.casefold())
        if key in seen:
            continue
        seen.add(key)
        combined_fields.append({
            "id": len(combined_fields) + 100,
            "label": label,
            "value": value,
            "type": field_type,
        })

    seeded = [
        {"id": 1, "label": "Phone", "value": resume_draft.get("phone", "") or (current_profile.phone if current_profile else "") or "", "type": "phone"},
        {"id": 2, "label": "LinkedIn", "value": resume_draft.get("linkedin", "") or (current_profile.linkedin if current_profile else "") or "", "type": "url"},
        {"id": 3, "label": "GitHub", "value": resume_draft.get("github", "") or (current_profile.github if current_profile else "") or "", "type": "url"},
        {"id": 4, "label": "Website", "value": resume_draft.get("website", "") or (current_profile.website if current_profile else "") or "", "type": "url"},
        {"id": 5, "label": "Email", "value": current_user.email or "", "type": "email"},
    ]
    return [field for field in seeded + combined_fields if _normalize_contact_value(field.get("value", ""))]


def _compact_import_text(value: object) -> str:
    def _coerce_item_to_dict(item: object) -> dict:
        if isinstance(item, dict):
            return item
        if hasattr(item, "model_dump"):
            try:
                dumped = item.model_dump()
                if isinstance(dumped, dict):
                    return dumped
            except Exception:
                pass
        if hasattr(item, "dict"):
            try:
                dumped = item.dict()
                if isinstance(dumped, dict):
                    return dumped
            except Exception:
                pass
        return {}

    def _format_item(item: dict) -> str:
        if not isinstance(item, dict):
            return ""
        ordered_keys = [
            ("label", "Label"), ("value", "Value"),
            ("title", "Title"), ("company", "Company"), ("duration", "Duration"),
            ("start_date", "Start"), ("end_date", "End"),
            ("degree", "Degree"), ("major", "Major"), ("institution", "Institution"),
            ("start_year", "Start"), ("end_year", "End"), ("year", "Year"),
            ("gpa", "GPA"), ("gpa_scale", "Scale"),
            ("description", "Description"),
        ]
        parts = []
        for key, label in ordered_keys:
            text = _normalize_contact_value(item.get(key, ""))
            if text:
                parts.append(f"{label}: {text}")
        return " | ".join(parts)

    if isinstance(value, str):
        return _normalize_contact_value(value)
    if isinstance(value, list):
        parts = []
        for index, item in enumerate(value, start=1):
            if isinstance(item, str) and item.strip():
                parts.append(item.strip())
            else:
                line = _format_item(_coerce_item_to_dict(item))
                if line:
                    parts.append(f"{index}. {line}")
        return "\n".join(parts)
    if isinstance(value, dict):
        return _format_item(value)
    coerced = _coerce_item_to_dict(value)
    if coerced:
        return _format_item(coerced)
    return _normalize_contact_value(str(value or ""))


def _extract_education_emergency(resume_text: str) -> list[dict]:
    text = str(resume_text or "")
    if not text.strip():
        return []

    degree_anchor = re.compile(
        r"\b(b\.?tech|b\.?e|b\.?sc|bachelor|m\.?tech|m\.?e|m\.?sc|master|ph\.?d|diploma|12th|10th|higher secondary|senior secondary|intermediate)\b",
        re.IGNORECASE,
    )
    institution_pattern = re.compile(r"(university|institute|college|school|academy|iit|nit|iiit|kiit)[^,;|]*", re.IGNORECASE)
    year_pattern = re.compile(r"(?:19|20)\d{2}")

    matches = list(degree_anchor.finditer(text))
    if not matches:
        return []

    entries: list[dict] = []
    seen = set()
    for idx, match in enumerate(matches):
        start = match.start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else min(len(text), start + 320)
        segment = _normalize_contact_value(text[start:end])
        if not segment:
            continue

        degree_match = re.search(
            r"(b\.?tech|b\.?e|b\.?sc|bachelor[^,;|]*|m\.?tech|m\.?e|m\.?sc|master[^,;|]*|ph\.?d[^,;|]*|diploma[^,;|]*|12th[^,;|]*|10th[^,;|]*|higher secondary[^,;|]*|senior secondary[^,;|]*|intermediate[^,;|]*)",
            segment,
            re.IGNORECASE,
        )
        institution_match = institution_pattern.search(segment)
        years = year_pattern.findall(segment)

        gpa = ""
        gpa_scale = ""
        frac = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*/\s*(100|10|4)\b", segment)
        pct = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*%", segment)
        marked = re.search(r"(?:cgpa|gpa|sgpa|percentage|marks?)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", segment, re.IGNORECASE)
        if frac:
            gpa = _normalize_contact_value(frac.group(1))
            gpa_scale = _normalize_contact_value(frac.group(2))
        elif pct:
            gpa = _normalize_contact_value(pct.group(1))
            gpa_scale = "100"
        elif marked:
            gpa = _normalize_contact_value(marked.group(1))
            if re.search(r"percentage|marks|%", segment, re.IGNORECASE):
                gpa_scale = "100"

        entry = {
            "degree": _normalize_contact_value(degree_match.group(0)) if degree_match else "",
            "institution": _normalize_contact_value(institution_match.group(0)) if institution_match else "",
            "major": "",
            "start_year": years[0] if len(years) >= 2 else "",
            "end_year": years[1] if len(years) >= 2 else "",
            "year": years[0] if len(years) == 1 else "",
            "gpa": gpa,
            "gpa_scale": gpa_scale,
        }
        if not any(entry.values()):
            continue

        key = (
            entry["degree"].casefold(),
            entry["institution"].casefold(),
            entry["start_year"],
            entry["end_year"],
            entry["year"],
            entry["gpa"],
            entry["gpa_scale"],
        )
        if key in seen:
            continue
        seen.add(key)
        entries.append(entry)

    if entries:
        return entries

    # Ultra-defensive fallback for PDFs where words are split/broken during extraction.
    # If we can find an EDUCATION section, capture meaningful raw lines so preview is not empty.
    lines = [_normalize_contact_value(line) for line in text.splitlines() if _normalize_contact_value(line)]

    def _compact_alnum(value: str) -> str:
        return re.sub(r"[^a-z0-9]", "", str(value or "").lower())

    start_index = -1
    for idx, line in enumerate(lines):
        token = _compact_alnum(line)
        if "education" in token:
            start_index = idx
            break

    if start_index == -1:
        return []

    stop_markers = (
        "technicalskills",
        "skills",
        "projects",
        "experience",
        "workhistory",
        "certifications",
        "achievements",
    )

    recovered: list[dict] = []
    seen_lines = set()
    for line in lines[start_index + 1:start_index + 40]:
        compact = _compact_alnum(line)
        if any(marker in compact for marker in stop_markers):
            break
        if compact in {"", "education"}:
            continue

        looks_edu = bool(re.search(
            r"bachelor|master|diploma|12th|10th|intermediate|high\s*school|secondary|cgpa|gpa|marks|%|(?:19|20)\d{2}",
            line,
            re.IGNORECASE,
        ))
        if not looks_edu:
            continue
        if compact in seen_lines:
            continue
        seen_lines.add(compact)

        years = re.findall(r"(?:19|20)\d{2}", line)
        mark_match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*%", line)
        gpa_match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*/\s*(100|10|4)", line)

        gpa = ""
        gpa_scale = ""
        if gpa_match:
            gpa = _normalize_contact_value(gpa_match.group(1))
            gpa_scale = _normalize_contact_value(gpa_match.group(2))
        elif mark_match:
            gpa = _normalize_contact_value(mark_match.group(1))
            gpa_scale = "100"

        recovered.append({
            "degree": line[:120],
            "institution": "",
            "major": "",
            "start_year": years[0] if len(years) >= 2 else "",
            "end_year": years[1] if len(years) >= 2 else "",
            "year": years[0] if len(years) == 1 else "",
            "gpa": gpa,
            "gpa_scale": gpa_scale,
        })

    return recovered[:6]



def _has_meaningful_education_entries(value: object) -> bool:
    if not isinstance(value, list):
        return False
    for item in value:
        if not isinstance(item, dict):
            continue
        if any(_normalize_contact_value(v) for v in item.values() if isinstance(v, str)):
            return True
    return False


def _extract_pdf_text_with_links(reader) -> str:
    text_parts = []
    links = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
        try:
            annotations = page.get("/Annots") or []
            for annotation in annotations:
                annotation_obj = annotation.get_object()
                action = annotation_obj.get("/A") if annotation_obj else None
                uri = action.get("/URI") if action else None
                if uri:
                    links.append(str(uri))
        except Exception:
            continue
    return _compose_text_with_links("\n".join(text_parts), links, 12000)


def _compare_import_value(key: str, current_value: object, resume_value: object) -> ProfileImportDiffItem:
    current_text = _compact_import_text(current_value)
    resume_text = _compact_import_text(resume_value)
    label_map = {
        "summary": "Summary",
        "phone": "Phone",
        "linkedin": "LinkedIn",
        "github": "GitHub",
        "website": "Website",
        "skills": "Skills",
        "experience": "Experience",
        "education": "Education",
    }

    if key in {"skills", "experience", "education"}:
        recommended_action = "use_resume" if not current_text else "keep_existing"
    else:
        recommended_action = "use_resume" if not current_text and resume_text else "keep_existing"

    return ProfileImportDiffItem(
        key=key,
        label=label_map.get(key, key.title()),
        current_value=current_text,
        resume_value=resume_text,
        recommended_action=recommended_action,
    )


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


def _get_resume_text(resume: Resume) -> str:
    """Extract text from a specific resume record (local or R2)."""
    from app.services import r2_service
    import os

    if not resume or not resume.filepath:
        return ""

    try:
        if resume.is_r2:
            return r2_service.extract_pdf_text_from_r2(resume.filepath)

        if not os.path.exists(resume.filepath):
            logger.warning(f"[AI] Resume file not found locally: {resume.filepath}")
            return ""

        from PyPDF2 import PdfReader
        reader = PdfReader(resume.filepath)
        return _extract_pdf_text_with_links(reader)
    except Exception as exc:
        logger.warning(f"[AI] Resume text extraction failed for {resume.filename}: {exc}")
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
            text = _extract_pdf_text_with_links(reader)
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


@router.post("/profile-import-preview", response_model=ProfileImportPreviewResponse)
def profile_import_preview(
    payload: ProfileImportPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    resume_query = db.query(Resume).filter(Resume.user_id == current_user.id)
    selected_resume_ids = [rid for rid in dict.fromkeys(payload.resume_ids or []) if isinstance(rid, int) and rid > 0]

    selected_resumes: list[Resume] = []
    if selected_resume_ids:
        selected_resumes = resume_query.filter(Resume.id.in_(selected_resume_ids)).all()
        found_ids = {resume.id for resume in selected_resumes}
        missing = [rid for rid in selected_resume_ids if rid not in found_ids]
        if missing:
            raise HTTPException(status_code=404, detail="One or more selected resumes were not found")
    elif payload.resume_id:
        resume = resume_query.filter(Resume.id == payload.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        selected_resumes = [resume]

    if not selected_resumes:
        fallback_resume = resume_query.filter(Resume.is_default == True).first()
        if not fallback_resume:
            fallback_resume = resume_query.order_by(Resume.uploaded_at.desc()).first()
        if fallback_resume:
            selected_resumes = [fallback_resume]

    if not selected_resumes:
        raise HTTPException(status_code=404, detail="No resume found. Upload a resume first.")

    combined_parts = []
    selected_names = []
    for resume in selected_resumes:
        selected_names.append(resume.filename or f"Resume {resume.id}")
        text = _get_resume_text(resume)
        if text:
            combined_parts.append(f"Resume: {resume.filename or resume.id}\n{text}")

    resume_text = "\n\n".join(combined_parts).strip()
    if not resume_text:
        resume_text = _get_default_resume_text(current_user.id, db)

    primary_resume = selected_resumes[0]
    resume_filename = selected_names[0] if len(selected_names) == 1 else f"{selected_names[0]} + {len(selected_names) - 1} more"

    resume_draft_raw = extract_profile_import_draft(
        resume_text=resume_text,
        full_name=current_user.full_name or "",
        email=current_user.email or "",
    )

    if not _has_meaningful_education_entries(resume_draft_raw.get("education")):
        emergency_education = _extract_education_emergency(resume_text)
        if emergency_education:
            logger.info(f"[AI] Router emergency education extraction recovered {len(emergency_education)} entries")
            resume_draft_raw["education"] = emergency_education

    resume_draft = ProfileImportDraft(
        summary=resume_draft_raw.get("summary", ""),
        phone=resume_draft_raw.get("phone", ""),
        linkedin=resume_draft_raw.get("linkedin", ""),
        github=resume_draft_raw.get("github", ""),
        website=resume_draft_raw.get("website", ""),
        contact_fields=_build_import_contact_fields(profile, resume_draft_raw, current_user),
        skills=resume_draft_raw.get("skills", []),
        experience=resume_draft_raw.get("experience", []),
        education=resume_draft_raw.get("education", []),
    )

    current_snapshot = _profile_snapshot(profile, current_user)
    diff = [
        _compare_import_value("summary", current_snapshot.get("summary", ""), resume_draft.summary),
        _compare_import_value("phone", current_snapshot.get("phone", ""), resume_draft.phone),
        _compare_import_value("linkedin", current_snapshot.get("linkedin", ""), resume_draft.linkedin),
        _compare_import_value("github", current_snapshot.get("github", ""), resume_draft.github),
        _compare_import_value("website", current_snapshot.get("website", ""), resume_draft.website),
        _compare_import_value("skills", current_snapshot.get("skills", []), resume_draft.skills),
        _compare_import_value("experience", current_snapshot.get("experience", []), resume_draft.experience),
        _compare_import_value("education", current_snapshot.get("education", []), resume_draft.education),
    ]

    return ProfileImportPreviewResponse(
        has_existing_profile_data=_has_real_profile_data(profile),
        resume_id=primary_resume.id,
        resume_filename=resume_filename,
        profile=ProfileOut(**current_snapshot),
        resume_draft=resume_draft,
        diff=diff,
    )


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
