from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Resume, User
from app.schemas import JobSearchRequest, JobSearchResponse
from app.services.job_search_service import build_resume_match_inputs, search_jobs_for_resumes


router = APIRouter(prefix="/api/jobs", tags=["Job Search"])


@router.post("/search", response_model=JobSearchResponse)
async def search_jobs(
    payload: JobSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id, Resume.id.in_(payload.resume_ids))
        .all()
    )

    if not rows:
        raise HTTPException(status_code=400, detail="No valid resumes selected")

    if len(rows) != len(payload.resume_ids):
        raise HTTPException(status_code=404, detail="One or more selected resumes were not found")

    prepared_resumes = build_resume_match_inputs(rows)

    try:
        jobs = await search_jobs_for_resumes(
            query=payload.query,
            location=payload.location or "",
            date_posted=payload.date_posted,
            page=payload.page,
            num_pages=payload.num_pages,
            resumes=prepared_resumes,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return JobSearchResponse(
        query=payload.query,
        total_jobs=len(jobs),
        jobs=jobs,
    )
