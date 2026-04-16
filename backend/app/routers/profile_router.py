from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Profile, QAPair
from app.schemas import ProfileOut, ProfileUpdate, SavedAnswerUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get("", response_model=ProfileOut)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    contact_fields = profile.contact_fields or []
    if not contact_fields:
        seeded_fields = [
            {"id": 1, "label": "Phone", "value": profile.phone or "", "type": "phone"},
            {"id": 2, "label": "LinkedIn", "value": profile.linkedin or "", "type": "url"},
            {"id": 3, "label": "GitHub", "value": profile.github or "", "type": "url"},
            {"id": 4, "label": "Website", "value": profile.website or "", "type": "url"},
            {"id": 5, "label": "Email", "value": current_user.email or "", "type": "email"},
        ]
        contact_fields = [field for field in seeded_fields if field["value"]]

    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "phone": profile.phone or "",
        "linkedin": profile.linkedin or "",
        "github": profile.github or "",
        "website": profile.website or "",
        "contact_fields": contact_fields,
        "skills": profile.skills or [],
        "experience": profile.experience or [],
        "education": profile.education or [],
        "summary": profile.summary or "",
    }


@router.put("", response_model=ProfileOut)
def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    update_data = payload.model_dump(exclude_unset=True)
    # Convert Pydantic models in lists to dicts for JSON storage
    if "experience" in update_data:
        update_data["experience"] = [
            item.model_dump() if hasattr(item, "model_dump") else item
            for item in update_data["experience"]
        ]
    if "education" in update_data:
        update_data["education"] = [
            item.model_dump() if hasattr(item, "model_dump") else item
            for item in update_data["education"]
        ]
    if "contact_fields" in update_data:
        update_data["contact_fields"] = [
            item.model_dump() if hasattr(item, "model_dump") else item
            for item in update_data["contact_fields"]
        ]

        # Keep legacy top-level contact columns in sync for backward compatibility.
        fields = update_data["contact_fields"]
        phone = next((f.get("value", "") for f in fields if f.get("type") == "phone" and f.get("value")), "")
        linkedin = next((f.get("value", "") for f in fields if f.get("label", "").strip().lower() == "linkedin" and f.get("value")), "")
        github = next((f.get("value", "") for f in fields if f.get("label", "").strip().lower() == "github" and f.get("value")), "")
        website = next((f.get("value", "") for f in fields if f.get("label", "").strip().lower() == "website" and f.get("value")), "")

        update_data["phone"] = phone
        update_data["linkedin"] = linkedin
        update_data["github"] = github
        update_data["website"] = website

    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


# ── Saved Answers (learned from form submissions) ────────

@router.get("/saved-answers")
def get_saved_answers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pairs = db.query(QAPair).filter(QAPair.user_id == current_user.id).all()
    return [{"id": p.id, "question": p.question, "answer": p.answer} for p in pairs]


@router.delete("/saved-answers")
def delete_all_saved_answers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    deleted_count = db.query(QAPair).filter(QAPair.user_id == current_user.id).delete(synchronize_session=False)
    db.commit()
    return {"ok": True, "deleted_count": deleted_count}


@router.put("/saved-answers/{answer_id}")
def update_saved_answer(
    answer_id: int,
    payload: SavedAnswerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pair = db.query(QAPair).filter(QAPair.id == answer_id, QAPair.user_id == current_user.id).first()
    if not pair:
        raise HTTPException(status_code=404, detail="Answer not found")
    if payload.answer is not None:
        pair.answer = payload.answer
    if payload.question is not None:
        pair.question = payload.question
    db.commit()
    return {"id": pair.id, "question": pair.question, "answer": pair.answer}


@router.delete("/saved-answers/{answer_id}")
def delete_saved_answer(
    answer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pair = db.query(QAPair).filter(QAPair.id == answer_id, QAPair.user_id == current_user.id).first()
    if not pair:
        raise HTTPException(status_code=404, detail="Answer not found")
    db.delete(pair)
    db.commit()
    return {"ok": True}

