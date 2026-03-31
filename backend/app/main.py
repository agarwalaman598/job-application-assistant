import asyncio
import os
from contextlib import asynccontextmanager
import datetime
import logging

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse as _JSONResponse

from app.database import engine, Base, SessionLocal, get_db
from app.rate_limit import limiter
from app.routers import auth_router, profile_router, resume_router, application_router, ai_router, contact_router, job_router
from app.routers.auth_email_router import router as auth_email_router

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# ── Unverified-user cleanup ───────────────────────────────────────────────────

UNVERIFIED_TTL_HOURS = 24  # delete accounts that weren't verified within this window

def _cleanup_unverified_users():
    """Delete users who never verified their email within the TTL window."""
    db = SessionLocal()
    try:
        from app.models import User
        cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=UNVERIFIED_TTL_HOURS)
        deleted = (
            db.query(User)
            .filter(User.is_verified == False, User.created_at < cutoff)
            .all()
        )
        count = len(deleted)
        for user in deleted:
            db.delete(user)
        db.commit()
        if count:
            logger.info(f"[Cleanup] Deleted {count} unverified user(s) older than {UNVERIFIED_TTL_HOURS}h")
    except Exception as e:
        db.rollback()
        logger.error(f"[Cleanup] Error during unverified-user cleanup: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start scheduler on startup
    from apscheduler.schedulers.background import BackgroundScheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        _cleanup_unverified_users,
        trigger="interval",
        hours=24,
        next_run_time=datetime.datetime.now() + datetime.timedelta(minutes=1),  # first run 1 min after boot
        id="cleanup_unverified_users",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(f"[Cleanup] Scheduler started — unverified users deleted after {UNVERIFIED_TTL_HOURS}h")
    yield
    scheduler.shutdown(wait=False)


# ─────────────────────────────────────────────────────────────────────────────

class _TimeoutMiddleware(BaseHTTPMiddleware):
    """Cancel requests that exceed 60 s — protects against hung LLM/R2 calls."""
    async def dispatch(self, request, call_next):
        try:
            return await asyncio.wait_for(call_next(request), timeout=60.0)
        except asyncio.TimeoutError:
            return _JSONResponse(
                status_code=504,
                content={"detail": "Request timed out. Please try again."},
            )


app = FastAPI(
    title="AI Smart Job Application Assistant",
    description="AI-powered job application form filling and optimization",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow React dev server + any production frontend URL
_cors_origins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
# Support comma-separated origins: FRONTEND_URL=https://foo.vercel.app,https://bar.vercel.app
for _url in os.getenv("FRONTEND_URL", "").split(","):
    _url = _url.strip()
    if _url and _url not in _cors_origins:
        _cors_origins.append(_url)
logger.info("[CORS] Allowed origins: %s", _cors_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)
app.add_middleware(_TimeoutMiddleware)

# Mount routers
app.include_router(auth_router.router)
app.include_router(auth_email_router)          # email verification + password reset
app.include_router(profile_router.router)
app.include_router(resume_router.router)
app.include_router(application_router.router)
app.include_router(contact_router.router)
app.include_router(ai_router.router)
app.include_router(job_router.router)


@app.get("/")
def root():
    return {"message": "AI Smart Job Application Assistant API", "docs": "/docs"}


@app.get("/health")
def health(db: Session = Depends(get_db)):
    """Health-check endpoint — verifies DB connectivity for Render health checks."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        logger.error(f"[Health] DB check failed: {e}")
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.get("/robots.txt", include_in_schema=False)
def robots_txt():
    """Prevent search engines from indexing API endpoints."""
    from starlette.responses import PlainTextResponse
    return PlainTextResponse("User-agent: *\nDisallow: /\n")
