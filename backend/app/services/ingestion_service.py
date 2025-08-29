from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session
from pypdf import PdfReader

from ..models import Job, Reading, Chunk, Summary
from .vector_service import add_texts


@dataclass
class IngestionResult:
    job_id: int
    reading_id: int


def get_storage_root() -> Path:
    # backend/app/main.py → backend/app/storage
    return Path(__file__).resolve().parent.parent / "storage"


def ensure_storage() -> Path:
    root = get_storage_root()
    (root / "uploads").mkdir(parents=True, exist_ok=True)
    (root / "indexes").mkdir(parents=True, exist_ok=True)
    return root


def create_ingestion_job(
    db: Session,
    *,
    week_id: int,
    filename: str,
    saved_path: Path,
) -> IngestionResult:
    # Record reading
    reading = Reading(week_id=week_id, filename=filename, file_path=str(saved_path))
    db.add(reading)
    db.flush()  # get reading.id

    # Create job queued
    job = Job(kind="ingestion", status="queued", progress=0, week_id=week_id)
    db.add(job)
    db.flush()

    return IngestionResult(job_id=job.id, reading_id=reading.id)


def _chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    import re

    # Split by sentences first
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks: List[str] = []
    current_chunk = ""
    
    for sentence in sentences:
        # If adding this sentence would exceed chunk size, flush current chunk
        if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            # Build overlap context from the end of the flushed chunk
            overlap_text = (
                " ".join(current_chunk.split()[-(overlap // 5):])
                if overlap > 0 else ""
            )
            # Start next chunk with overlap plus this sentence
            current_chunk = f"{overlap_text} {sentence}".strip() if overlap_text else sentence
        else:
            # Otherwise, keep appending sentences
            current_chunk = f"{current_chunk} {sentence}".strip() if current_chunk else sentence

    # Append any remaining text
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks


def process_ingestion_job(db_factory, *, job_id: int, reading_id: int, week_id: int) -> None:
    # Use a new DB session inside background task
    db: Session = db_factory()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return
        job.status = "running"
        job.progress = 5
        job.updated_at = datetime.utcnow()
        db.commit()

        reading = db.query(Reading).filter(Reading.id == reading_id).first()
        if not reading:
            job.status = "error"
            job.error = "Reading not found"
            job.updated_at = datetime.utcnow()
            db.commit()
            return

        # Extract text from PDF
        pdf_path = Path(reading.file_path)
        if not pdf_path.exists():
            job.status = "error"
            job.error = "Uploaded file missing on disk"
            job.updated_at = datetime.utcnow()
            db.commit()
            return

        reader = PdfReader(str(pdf_path))
        texts: List[str] = []
        for page in reader.pages:
            try:
                t = page.extract_text() or ""
            except Exception:
                t = ""
            texts.append(t)
        full_text = "\n".join(texts)

        job.progress = 30
        job.updated_at = datetime.utcnow()
        db.commit()

        # Chunking
        chunks = _chunk_text(full_text)
        for idx, ch in enumerate(chunks):
            db.add(Chunk(reading_id=reading.id, idx=idx, content=ch, meta_json=None))
        db.commit()

        job.progress = 60
        job.updated_at = datetime.utcnow()
        db.commit()

        # Build metadata and add to index
        metadatas: List[Dict[str, Any]] = [
            {"reading_id": reading.id, "chunk_idx": idx, "filename": reading.filename}
            for idx in range(len(chunks))
        ]
        add_texts(week_id=week_id, texts=chunks, metadatas=metadatas)

        # Invalidate cached summary for this week
        db.query(Summary).filter(Summary.week_id == week_id).delete()
        db.commit()

        job.progress = 100
        job.status = "done"
        job.updated_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status = "error"
                job.error = str(e)
                job.updated_at = datetime.utcnow()
                db.commit()
        finally:
            pass
    finally:
        db.close()
