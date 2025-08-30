from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text
from fastapi.responses import JSONResponse

from ..database import session_scope


router = APIRouter(prefix="/health", tags=["health"])


@router.get("", summary="Service health status")
def get_health():
    db_ok = False
    try:
        with session_scope() as session:
            session.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        db_ok = False

    # Vector index not initialized at this stage
    vector_status = "not_initialized"

    payload = {
        "status": "ok" if db_ok else "degraded",
        "components": {
            "database": {"ok": db_ok},
            "vector_index": {"status": vector_status},
        },
    }
    status_code = 200 if db_ok else 503
    return JSONResponse(content=payload, status_code=status_code, headers={"Cache-Control": "no-store"})
