import io
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import User, Resume
from app.schemas import ResumeOut
from app.auth import get_current_user
from app.services import r2_service

class AddLinkPayload(BaseModel):
    title: str
    url: str

class UpdateLinkPayload(BaseModel):
    drive_link: Optional[str] = None

router = APIRouter(prefix="/api/resumes", tags=["Resumes"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "resumes")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=list[ResumeOut])
def list_resumes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.uploaded_at.desc()).all()


@router.post("/link", response_model=ResumeOut)
def add_resume_link(
    payload: AddLinkPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a link-only resume entry (no PDF upload)."""
    existing_count = db.query(Resume).filter(Resume.user_id == current_user.id).count()
    resume = Resume(
        user_id=current_user.id,
        filename=payload.title,
        filepath="",
        drive_link=payload.url,
        is_default=existing_count == 0,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.patch("/{resume_id}/link", response_model=ResumeOut)
def update_resume_link(
    resume_id: int,
    payload: UpdateLinkPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add or update the Google Drive link on an existing resume."""
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume.drive_link = payload.drive_link or None
    db.commit()
    db.refresh(resume)
    return resume


@router.post("/upload", response_model=ResumeOut)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    content = await file.read()
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    existing_count = db.query(Resume).filter(Resume.user_id == current_user.id).count()

    if r2_service.is_r2_configured():
        # Upload to Cloudflare R2
        r2_key = f"resumes/{unique_name}"
        try:
            r2_service.upload_file(content, r2_key)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"R2 upload failed: {e}")
        resume = Resume(
            user_id=current_user.id,
            filename=file.filename,
            filepath=r2_key,
            is_r2=True,
            is_default=existing_count == 0,
        )
    else:
        # Fallback: save locally
        filepath = os.path.join(UPLOAD_DIR, unique_name)
        with open(filepath, "wb") as f:
            f.write(content)
        resume = Resume(
            user_id=current_user.id,
            filename=file.filename,
            filepath=filepath,
            is_r2=False,
            is_default=existing_count == 0,
        )

    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("/{resume_id}/download")
def download_resume(
    resume_id: int,
    mode: str = "download",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream the resume PDF back to the client (supports both R2 and local storage).
    Use ?mode=view to open inline in browser, ?mode=download (default) to save as file.
    """
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if not resume.filepath:
        raise HTTPException(status_code=404, detail="This resume has no attached file")

    safe_filename = resume.filename.replace('"', '')
    disposition = "inline" if mode == "view" else "attachment"
    content_disposition = f'{disposition}; filename="{safe_filename}"'

    if resume.is_r2:
        try:
            pdf_bytes = r2_service.download_file(resume.filepath)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch file from storage: {e}")
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": content_disposition},
        )
    else:
        if not os.path.exists(resume.filepath):
            raise HTTPException(status_code=404, detail="File not found on server")
        return FileResponse(
            resume.filepath,
            media_type="application/pdf",
            headers={"Content-Disposition": content_disposition},
        )


@router.put("/{resume_id}/default", response_model=ResumeOut)
def set_default_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Unset all defaults
    db.query(Resume).filter(Resume.user_id == current_user.id).update({"is_default": False})
    resume.is_default = True
    db.commit()
    db.refresh(resume)
    return resume


@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if resume.filepath:
        if resume.is_r2:
            r2_service.delete_file(resume.filepath)  # filepath is R2 object key
        elif os.path.exists(resume.filepath):
            os.remove(resume.filepath)

    db.delete(resume)
    db.commit()
    return {"detail": "Resume deleted"}
