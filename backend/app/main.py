import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import datetime
import logging

from app.database import engine, Base, SessionLocal
from app.routers import auth_router, profile_router, resume_router, application_router, ai_router
from app.routers.auth_email_router import router as auth_email_router

logger = logging.getLogger(__name__)

# ── Unverified-user cleanup ───────────────────────────────────────────────────

UNVERIFIED_TTL_HOURS = 24  # delete accounts that weren't verified within this window

def _cleanup_unverified_users():
    """Delete users who never verified their email within the TTL window."""
    db = SessionLocal()
    try:
        from app.models import User
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=UNVERIFIED_TTL_HOURS)
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

app = FastAPI(
    title="AI Smart Job Application Assistant",
    description="AI-powered job application form filling and optimization",
    version="1.0.0",
    lifespan=lifespan,
)

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
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth_router.router)
app.include_router(auth_email_router)          # email verification + password reset
app.include_router(profile_router.router)
app.include_router(resume_router.router)
app.include_router(application_router.router)
app.include_router(ai_router.router)


@app.get("/")
def root():
    return {"message": "AI Smart Job Application Assistant API", "docs": "/docs"}


@app.get("/health")
def health():
    """Health-check endpoint for container/load-balancer probes."""
    return {"status": "ok"}
