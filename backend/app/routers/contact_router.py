from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Application, Contact, User
from app.schemas import ContactCreate, ContactOut, ContactUpdate

router = APIRouter(prefix="/api/contacts", tags=["Contacts"])


def _get_user_applications(db: Session, user_id: int, application_ids: list[int]) -> list[Application]:
    if not application_ids:
        return []

    unique_ids = list(dict.fromkeys(application_ids))
    applications = (
        db.query(Application)
        .filter(Application.user_id == user_id, Application.id.in_(unique_ids))
        .all()
    )
    if len(applications) != len(unique_ids):
        raise HTTPException(status_code=400, detail="One or more selected applications were not found")
    return applications


@router.get("", response_model=list[ContactOut])
def list_contacts(
    contact_type: Optional[str] = Query(None),
    application_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Contact)
        .options(joinedload(Contact.applications))
        .filter(Contact.user_id == current_user.id)
    )

    if contact_type:
        query = query.filter(Contact.contact_type == contact_type)

    if q:
        like_q = f"%{q.strip()}%"
        query = query.filter(
            (Contact.full_name.ilike(like_q)) |
            (Contact.company.ilike(like_q)) |
            (Contact.email.ilike(like_q))
        )

    if application_id:
        query = query.join(Contact.applications).filter(Application.id == application_id)

    return query.order_by(Contact.updated_at.desc()).all()


@router.post("", response_model=ContactOut)
def create_contact(
    payload: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    application_ids = data.pop("application_ids", []) or []

    contact = Contact(user_id=current_user.id, **data)
    contact.applications = _get_user_applications(db, current_user.id, application_ids)

    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.put("/{contact_id}", response_model=ContactOut)
def update_contact(
    contact_id: int,
    payload: ContactUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contact = (
        db.query(Contact)
        .options(joinedload(Contact.applications))
        .filter(Contact.id == contact_id, Contact.user_id == current_user.id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "application_ids" in update_data:
        application_ids = update_data.pop("application_ids") or []
        contact.applications = _get_user_applications(db, current_user.id, application_ids)

    for key, value in update_data.items():
        if value is not None:
            setattr(contact, key, value)

    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}")
def delete_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    db.delete(contact)
    db.commit()
    return {"detail": "Contact deleted"}
