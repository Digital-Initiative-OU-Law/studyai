from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import get_db, get_current_user
from ..config import settings
from ..models import Conversation, User


router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionStart(BaseModel):
    week_id: Optional[int] = Field(default=None, ge=1)


class SessionEnd(BaseModel):
    transcript: Optional[str] = None


def sessions_root() -> Path:
    return Path(__file__).resolve().parent.parent / "storage" / "sessions"


def _enforce_timeout(session_id: int, sleep_seconds: int, db_factory):
    import time
    from sqlalchemy.orm import Session as SASession
    time.sleep(sleep_seconds)
    db: SASession = db_factory()
    try:
        conv = db.query(Conversation).filter(Conversation.id == session_id).first()
        if conv and not conv.ended_at:
            conv.ended_at = datetime.utcnow()
            conv.duration_seconds = sleep_seconds
            db.commit()
    except Exception as e:
        db.rollback()
        # Optionally log the error
        raise
    finally:
        db.close()

@router.post("/start", summary="Start a voice session")
def start_session(payload: SessionStart, background_tasks: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    expires_at = datetime.utcnow() + timedelta(seconds=settings.SESSION_MAX_SECONDS)
    import uuid
    session_id = str(uuid.uuid4())
    conv = Conversation(user_id=user.id, week_id=payload.week_id, session_id=session_id)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    # Schedule auto-timeout enforcement
    from ..database import SessionLocal
    background_tasks.add_task(_enforce_timeout, conv.id, settings.SESSION_MAX_SECONDS, SessionLocal)
    return {"id": conv.id, "expires_at": expires_at.isoformat() + "Z"}


@router.post("/{session_id}/end", summary="End a voice session")
def end_session(session_id: int, payload: SessionEnd, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conv = db.query(Conversation).filter(Conversation.id == session_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Session not found")
    if conv.user_id and conv.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    # Write transcript file first if provided
    transcript_path = None
    if payload.transcript:
        try:
            root = sessions_root() / f"conv_{conv.id}"
            root.mkdir(parents=True, exist_ok=True)
            tpath = root / "transcript.txt"
            tpath.write_text(payload.transcript, encoding="utf-8")
            transcript_path = str(tpath)
        except Exception as e:
            # If file writing fails, don't proceed with DB changes
            raise HTTPException(status_code=500, detail=f"Failed to write transcript: {str(e)}")

    try:
        # Update conversation end time
        conv.ended_at = datetime.utcnow()
        # Note: transcript_path field doesn't exist in the model, 
        # so we're just saving the file without updating the database
        
        # Single commit for all changes
        db.commit()
    except Exception as e:
        # Rollback DB changes
        db.rollback()
        
        # Clean up orphaned file if it was created
        if transcript_path:
            try:
                Path(transcript_path).unlink(missing_ok=True)
                # Also try to remove the directory if it's empty
                Path(transcript_path).parent.rmdir()
            except Exception:
                # Log cleanup failure but don't raise - main error is more important
                pass
        
        raise HTTPException(status_code=500, detail=f"Failed to update session: {str(e)}")

    return {"status": "ended", "id": conv.id}
