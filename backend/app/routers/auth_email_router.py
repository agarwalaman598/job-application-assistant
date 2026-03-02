"""
Auth Email Router — handles email verification and password reset.
All endpoints are rate-limited and token-based.
"""
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth import hash_password
from app.rate_limit import limiter
from app.services.email_service import send_verification_email, send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["Auth — Email"])

APP_ENV = os.getenv("APP_ENV", "production")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")
IS_DEV = APP_ENV == "development"


# ─── Schemas ─────────────────────────────────────────────────────────────────

class EmailRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_token() -> str:
    return secrets.token_urlsafe(32)


def _dev_fallback(link_type: str, token: str) -> dict:
    """In dev mode, return the link directly so email can be tested without a verified domain."""
    if link_type == "verify":
        url = f"{APP_BASE_URL}/verify-email?token={token}"
    else:
        url = f"{APP_BASE_URL}/reset-password?token={token}"
    return {
        "detail": "⚠️ Dev mode: email not sent (Resend sandbox restriction). Use the link below to test.",
        "dev_link": url,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/send-verification")
@limiter.limit("3/15minutes")
def send_verification(request: Request, payload: EmailRequest, db: Session = Depends(get_db)):
    """Send (or resend) email verification link."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"detail": "If this email is registered, a verification link will be sent."}

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified.")

    token = _make_token()
    user.verification_token = token
    user.verification_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    db.commit()

    ok = send_verification_email(to=user.email, token=token, db=db, user_id=user.id)
    if not ok:
        if IS_DEV:
            return _dev_fallback("verify", token)
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")

    return {"detail": "Verification email sent. Please check your inbox."}


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify email token from the link in the verification email."""
    user = db.query(User).filter(User.verification_token == token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token.")

    if user.verification_token_expires and user.verification_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification link has expired. Please request a new one.")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()

    return {"detail": "Email verified successfully! You can now log in."}


@router.post("/forgot-password")
@limiter.limit("3/15minutes")
def forgot_password(request: Request, payload: EmailRequest, db: Session = Depends(get_db)):
    """Send a password reset link to the provided email."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"detail": "If this email is registered, a reset link will be sent."}

    token = _make_token()
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    ok = send_password_reset_email(to=user.email, token=token, db=db, user_id=user.id)
    if not ok:
        if IS_DEV:
            return _dev_fallback("reset", token)
        raise HTTPException(status_code=500, detail="Failed to send reset email. Please try again.")

    return {"detail": "Password reset email sent. Please check your inbox."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a valid reset token."""
    user = db.query(User).filter(User.reset_token == payload.token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"detail": "Password reset successfully. You can now log in with your new password."}
