from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth import get_db
from ..services.summary_service import get_or_generate_summary


router = APIRouter(prefix="/summaries", tags=["summaries"])


@router.get("", summary="Get or generate summary for week")
def get_summary(
    week_id: int = Query(..., ge=1, le=52, description="Week number (1-52)"),
    db: Session = Depends(get_db),
):
    try:
        summary = get_or_generate_summary(db, week_id=week_id)
        if not summary:
            raise HTTPException(status_code=404, detail="Summary not found")

        # Provide both raw content and best-effort bullets for frontend convenience
        bullets = []
        if summary.content:
            for line in summary.content.splitlines():
                stripped = line.strip()
                if stripped.startswith(("-", "•", "*")) and len(stripped) > 3:
                    # Remove bullet marker and extra whitespace
                    bullet = stripped.lstrip("-•* ").strip()
                    if bullet:
                        bullets.append(bullet)

        return {
            "week_id": week_id,
            "content": summary.content,
            "bullets": bullets,
            "id": summary.id,
        }
    except HTTPException:
        # Preserve any HTTPException(status_code=...) raised above
        raise
    except Exception as e:
        # Log internal errors without exposing them to the client
        import logging
        logging.error(f"Error generating summary for week {week_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while generating summary",
        )
