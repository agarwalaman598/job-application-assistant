import os

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from google.auth.exceptions import TransportError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import create_access_token
from app.database import get_db
from app.models import Profile, User
from app.rate_limit import limiter
from app.schemas import GoogleAuthRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

APP_ENV = os.getenv("APP_ENV", "production")
IS_DEV = APP_ENV == "development"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

_VALID_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def _set_auth_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not IS_DEV,
        samesite="none" if not IS_DEV else "lax",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


def _ensure_profile(db: Session, user_id: int) -> None:
    existing_profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if existing_profile:
        return
    db.add(Profile(user_id=user_id))


def _normalize_auth_provider(user: User) -> None:
    if user.google_id and user.hashed_password:
        user.auth_provider = "both"
    elif user.google_id:
        user.auth_provider = "google"
    else:
        user.auth_provider = "local"


@router.post("/google")
@limiter.limit("5/minute")
def google_login(
    request: Request,
    payload: GoogleAuthRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google login is not configured")

    try:
        token_info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            audience=GOOGLE_CLIENT_ID,
        )
    except TransportError:
        raise HTTPException(status_code=503, detail="Could not reach Google to verify the token. Please try again.")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    issuer = token_info.get("iss")
    if issuer not in _VALID_ISSUERS:
        raise HTTPException(status_code=401, detail="Invalid Google token issuer")

    email = (token_info.get("email") or "").strip().lower()
    sub = (token_info.get("sub") or "").strip()
    full_name = (token_info.get("name") or "").strip()
    avatar_url = (token_info.get("picture") or "").strip() or None

    email_verified = token_info.get("email_verified")
    is_email_verified = email_verified is True or str(email_verified).lower() == "true"

    if not sub:
        raise HTTPException(status_code=401, detail="Google account id is missing")
    if not email:
        raise HTTPException(status_code=401, detail="Google account email is missing")
    if not is_email_verified:
        raise HTTPException(status_code=401, detail="Google email is not verified")

    user = db.query(User).filter(User.google_id == sub).first()
    if user:
        user.is_verified = True
        user.verification_token = None
        user.verification_token_expires = None
        if avatar_url:
            user.avatar_url = avatar_url
        _normalize_auth_provider(user)
        _ensure_profile(db, user.id)
        db.commit()
        db.refresh(user)
    else:
        existing_by_email = db.query(User).filter(func.lower(User.email) == email).first()
        if existing_by_email:
            if existing_by_email.google_id and existing_by_email.google_id != sub:
                raise HTTPException(
                    status_code=409,
                    detail="This email is already linked to a different Google account",
                )

            existing_by_email.google_id = sub
            if avatar_url:
                existing_by_email.avatar_url = avatar_url
            existing_by_email.is_verified = True
            existing_by_email.verification_token = None
            existing_by_email.verification_token_expires = None
            _normalize_auth_provider(existing_by_email)
            _ensure_profile(db, existing_by_email.id)
            db.commit()
            db.refresh(existing_by_email)
            user = existing_by_email
        else:
            user = User(
                email=email,
                full_name=full_name or email.split("@")[0],
                hashed_password=None,
                google_id=sub,
                avatar_url=avatar_url,
                auth_provider="google",
                is_verified=True,
                verification_token=None,
                verification_token_expires=None,
            )
            db.add(user)
            db.flush()
            _ensure_profile(db, user.id)
            db.commit()
            db.refresh(user)

    access_token = create_access_token(data={"sub": user.id, "email": user.email, "full_name": user.full_name or ""})
    _set_auth_cookie(response, access_token)

    return {
        "access_token": access_token,
        "message": "Logged in",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name or ""},
    }
