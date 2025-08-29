from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth import get_db
from ..services.summary_service import get_or_generate_summary


router = APIRouter(prefix="/summaries", tags=["summaries"])


@router.get("", summary="Get or generate summary for week")
def get_summary(week_id: int = Query(..., ge=1), db: Session = Depends(get_db)):
    try:
        summary = get_or_generate_summary(db, week_id=week_id)
        # Provide both raw content and best-effort bullets for frontend convenience
        bullets = [
            line.strip("-• ")
            for line in summary.content.splitlines()
            if line.strip().startswith(("-", "•")) and len(line.strip()) > 1
        ]
        return {"week_id": week_id, "content": summary.content, "bullets": bullets, "id": summary.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
