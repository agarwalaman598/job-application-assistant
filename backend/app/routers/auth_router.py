import os
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Profile
from app.schemas import UserCreate, UserOut, Token, LoginRequest
from app.auth import hash_password, verify_password, create_access_token
from app.services.email_service import send_verification_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

APP_ENV = os.getenv("APP_ENV", "production")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")
IS_DEV = APP_ENV == "development"


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    token = secrets.token_urlsafe(32)

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        is_verified=False,
        verification_token=token,
        verification_token_expires=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Auto-create an empty profile
    profile = Profile(user_id=user.id)
    db.add(profile)
    db.commit()

    # Send verification email
    ok = send_verification_email(to=user.email, token=token, db=db, user_id=user.id)

    response = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_verified": user.is_verified,
        "email_sent": ok,
    }

    if not ok and IS_DEV:
        verify_url = f"{APP_BASE_URL}/verify-email?token={token}"
        response["dev_link"] = verify_url
        response["dev_note"] = "Dev mode: email not sent. Use dev_link to verify manually."

    return response


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}
