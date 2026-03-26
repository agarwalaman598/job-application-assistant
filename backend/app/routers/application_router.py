from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from typing import Optional

from app.database import get_db
from app.models import User, Application, Resume
from app.schemas import ApplicationCreate, ApplicationUpdate, ApplicationOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/applications", tags=["Applications"])


@router.get("", response_model=list[ApplicationOut])
def list_applications(
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Application).options(joinedload(Application.resume)).filter(Application.user_id == current_user.id)
    if status:
        query = query.filter(Application.status == status)
    return query.order_by(Application.applied_at.desc()).all()


@router.post("", response_model=ApplicationOut)
def create_application(
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    resume_id = data.get("resume_id")
    if resume_id is not None:
        resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
        if not resume:
            raise HTTPException(status_code=400, detail="Selected resume not found")

    app = Application(user_id=current_user.id, **data)
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.put("/{app_id}", response_model=ApplicationOut)
def update_application(
    app_id: int,
    payload: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "resume_id" in update_data and update_data["resume_id"] is not None:
        resume = db.query(Resume).filter(
            Resume.id == update_data["resume_id"],
            Resume.user_id == current_user.id,
        ).first()
        if not resume:
            raise HTTPException(status_code=400, detail="Selected resume not found")

    for key, value in update_data.items():
        if key == "resume_id":
            setattr(app, key, value)
        elif value is not None:
            setattr(app, key, value)

    db.commit()
    db.refresh(app)
    return app


@router.delete("/{app_id}")
def delete_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    db.delete(app)
    db.commit()
    return {"detail": "Application deleted"}
