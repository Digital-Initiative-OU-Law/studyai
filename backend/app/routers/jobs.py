from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_db
from ..models import Job


router = APIRouter(prefix="/jobs", tags=["ingestion"])


@router.get("/{job_id}", summary="Get job progress (alias)")
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

