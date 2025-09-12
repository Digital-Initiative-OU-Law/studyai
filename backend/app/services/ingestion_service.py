from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session
from pypdf import PdfReader

from ..models import Job, Reading, Chunk, Summary, Week
from .vector_service import add_texts

"""
Ingestion Service with Race Condition Protection

This service handles PDF ingestion with protection against race conditions
when multiple ingestion jobs run concurrently. Key features:

1. Intelligent Summary Deletion: Only deletes summaries older than the current job
2. Row-level Locking: Uses SELECT ... FOR UPDATE when supported
3. Fallback Strategy: Graceful degradation if advanced locking fails
4. Transaction Safety: Proper commit/rollback handling
5. Non-blocking: Summary cleanup failures don't fail the entire job

Race Condition Protection Strategy:
- Each ingestion job only deletes summaries created BEFORE it started
- This preserves summaries from concurrent jobs that started later
- Row-level locking ensures atomicity during deletion
- Fallback to regular deletion if locking is not supported
"""


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

        # Validate week exists early to avoid FK surprises later
        if not db.query(Week).filter(Week.id == week_id).first():
            job.status = "error"
            job.error = f"Week {week_id} not found"
            job.updated_at = datetime.utcnow()
            db.commit()
            return

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
            except Exception as e:
                # Log the error for debugging
                print(f"Warning: Failed to extract text from page: {e}")
                t = ""
            texts.append(t)
        full_text = "\n".join(texts)

        # Guard: if no extractable text, fail gracefully with a clear message
        if not full_text.strip():
            job.status = "error"
            job.error = "No extractable text found in PDF (scanned image or empty)."
            job.updated_at = datetime.utcnow()
            db.commit()
            return

        job.progress = 30
        job.updated_at = datetime.utcnow()
        db.commit()

        # Chunking
        chunks = _chunk_text(full_text)
        # Drop tiny/empty chunks to avoid empty embeddings
        chunks = [c for c in chunks if c and c.strip() and len(c.strip()) >= 20]

        if not chunks:
            job.status = "error"
            job.error = "PDF text too sparse to index (no valid chunks)."
            job.updated_at = datetime.utcnow()
            db.commit()
            return
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
        
        try:
            add_texts(week_id=week_id, texts=chunks, metadatas=metadatas)
        except Exception as e:
            # Retry with truncated texts in case of tokenizer edge cases
            try:
                safe_chunks = [c[:1200] for c in chunks]
                add_texts(week_id=week_id, texts=safe_chunks, metadatas=metadatas)
            except Exception as e2:
                error_msg = f"Indexing error: {str(e2)}"
                print(f"Error in job {job_id}: {error_msg}")
                job.status = "error"
                job.error = error_msg[:500]  # Truncate error message to fit in DB
                job.updated_at = datetime.utcnow()
                db.commit()
                return

        # Invalidate cached summaries for this week with race condition protection
        # Use intelligent deletion strategy to prevent data loss from concurrent jobs
        try:
            # Get the current job's creation timestamp to identify which summaries to delete
            current_job = db.query(Job).filter(Job.id == job_id).first()
            if not current_job:
                print(f"Warning: Job {job_id} not found during summary cleanup")
                return
            
            # Only delete summaries that were created BEFORE this ingestion job started
            # This prevents race conditions by preserving summaries from concurrent jobs
            job_start_time = current_job.created_at
            
            # Find summaries to delete (those older than this job)
            summaries_to_delete = db.query(Summary).filter(
                Summary.week_id == week_id,
                Summary.created_at < job_start_time
            ).all()
            
            if summaries_to_delete:
                # Use row-level locking for the deletion to ensure atomicity
                try:
                    # Lock the specific summaries we want to delete
                    locked_summaries = db.query(Summary).filter(
                        Summary.id.in_([s.id for s in summaries_to_delete])
                    ).with_for_update().all()
                    
                    # Delete the locked summaries
                    for summary in locked_summaries:
                        db.delete(summary)
                    
                    # Commit the deletion
                    db.commit()
                    print(f"Deleted {len(locked_summaries)} outdated summaries for week {week_id} in job {job_id}")
                    
                except Exception as lock_error:
                    # Fallback: if row-level locking fails, use regular deletion
                    db.rollback()
                    print(f"Warning: Row-level locking failed, using fallback deletion: {lock_error}")
                    
                    # Regular deletion without locking (less safe but functional)
                    for summary in summaries_to_delete:
                        db.delete(summary)
                    db.commit()
                    print(f"Deleted {len(summaries_to_delete)} summaries using fallback method")
            else:
                print(f"No outdated summaries to delete for week {week_id} in job {job_id}")
                
        except Exception as e:
            # If deletion fails, rollback and log but don't fail the entire job
            try:
                db.rollback()
            except:
                pass  # Ignore rollback errors
            print(f"Warning: Failed to clean up summaries for job {job_id}: {e}")
            # Continue with the job - this is not critical

        job.progress = 100
        job.status = "done"
        job.updated_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = "error"
            job.error = str(e)
            job.updated_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()
