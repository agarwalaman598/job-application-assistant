import os
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Profile
from app.schemas import UserCreate, UserOut, Token, LoginRequest
from app.auth import hash_password, verify_password, create_access_token, get_current_user
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


@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in. Check your inbox for the verification link.",
        )

    access_token = create_access_token(data={"sub": user.id, "email": user.email, "full_name": user.full_name or ""})

    # Set httpOnly cookie — JS cannot read this, protecting against XSS token theft
    # Production: samesite=none required for cross-domain (Vercel frontend + Render backend)
    # Dev: samesite=lax is fine since frontend and backend share localhost
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not IS_DEV,
        samesite="none" if not IS_DEV else "lax",
        max_age=60 * 60 * 24,   # 24 hours
        path="/",
    )
    return {
        "message": "Logged in",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name or ""},
    }


@router.post("/logout")
def logout(response: Response):
    """Clear the auth cookie, effectively ending the session."""
    response.delete_cookie(key="access_token", path="/", samesite="none" if not IS_DEV else "lax")
    return {"message": "Logged out"}


@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    """Return current user info — used by frontend to verify session on page load."""
    user = get_current_user(request, db)
    return {"id": user.id, "email": user.email, "full_name": user.full_name or ""}
