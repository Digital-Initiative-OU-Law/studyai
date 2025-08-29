from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, BackgroundTasks
from sqlalchemy.orm import Session

from ..auth import get_db
from ..database import SessionLocal
from ..services.ingestion_service import ensure_storage, create_ingestion_job, process_ingestion_job
from ..models import Job


router = APIRouter(prefix="/readings", tags=["ingestion"])


@router.post("/upload", summary="Upload a PDF for ingestion")
async def upload_reading(
    week_id: int = Query(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    if file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=415, detail="Only PDF files are accepted")

    storage_root = ensure_storage()
    uploads = storage_root / "uploads" / f"week_{week_id}"
    uploads.mkdir(parents=True, exist_ok=True)

    import uuid
    # Sanitize filename and prepend a UUID for uniqueness
    safe_name = (Path(file.filename or "upload.pdf")).name
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    dest = uploads / unique_name

    # Basic PDF magic check and streaming write with size cap
    MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50MB default; consider moving to settings
    await file.seek(0)
    head = await file.read(5)
    if not head.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="Invalid PDF signature")
    await file.seek(0)

    written = 0
    with dest.open("wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            written += len(chunk)
            if written > MAX_UPLOAD_BYTES:
                dest.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File too large")
            f.write(chunk)
    # Create queued ingestion job and reading record
    res = create_ingestion_job(db, week_id=week_id, filename=file.filename, saved_path=dest)

    # Kick off background processing
    if background_tasks is not None:
        background_tasks.add_task(process_ingestion_job, SessionLocal, job_id=res.job_id, reading_id=res.reading_id, week_id=week_id)

    return {"job_id": res.job_id, "reading_id": res.reading_id, "status": "queued"}


@router.get("/jobs/{job_id}", summary="Get ingestion job progress")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job.id,
        "kind": job.kind,
        "status": job.status,
        "progress": job.progress,
        "error": job.error,
        "week_id": job.week_id,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }
