from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text

from ..database import session_scope
from ..config import settings
from ..auth import get_current_user
from ..models import User


router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


@router.get("", summary="Detailed diagnostics (admin only)")
def diagnostics(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    db_ok = False
    try:
        with session_scope() as session:
            session.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        db_ok = False

    vector_status = "not_initialized"

    return {
        "status": "ok" if db_ok else "degraded",
        "components": {
            "database": {"ok": db_ok},
            "vector_index": {"status": vector_status},
            "anthropic": {"configured": bool(settings.ANTHROPIC_API_KEY)},
            "elevenlabs": {"configured": bool(settings.ELEVEN_API_KEY)},
            "auth": {"configured": bool(settings.JWT_SECRET)},
        },
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "role": current_user.role,
        },
    }

