from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth_router, profile_router, resume_router, application_router, ai_router
from app.routers.auth_email_router import router as auth_email_router

# Tables are managed by Alembic migrations
# Base.metadata.create_all(bind=engine)  # uncomment only for quick local dev w/o Alembic

app = FastAPI(
    title="AI Smart Job Application Assistant",
    description="AI-powered job application form filling and optimization",
    version="1.0.0",
)

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
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
