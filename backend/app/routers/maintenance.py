from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..auth import get_db, get_current_user
from ..models import User, Reading, Chunk
from ..services.vector_service import reset_index, rebuild_index


router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.post("/reindex", summary="Rebuild vector index for a week (admin)")
def reindex_week(week_id: int = Query(..., ge=1), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    # Collect all chunks for readings in this week
    reading_ids = [r.id for r in db.query(Reading).filter(Reading.week_id == week_id).all()]
    if not reading_ids:
        raise HTTPException(status_code=404, detail="No readings found for week")

    chunks = (
        db.query(Chunk)
        .filter(Chunk.reading_id.in_(reading_ids))
        .order_by(Chunk.reading_id.asc(), Chunk.idx.asc())
        .all()
    )
    if not chunks:
        raise HTTPException(status_code=404, detail="No chunks found for week")

    texts = [c.content for c in chunks]
    metadatas = [{"reading_id": c.reading_id, "chunk_idx": c.idx} for c in chunks]

    try:
        # Build new index first (perhaps with a temporary name)
        rebuild_index(week_id, texts, metadatas)
    except Exception as e:
        # Log the error and re-raise
        raise HTTPException(status_code=500, detail=f"Failed to rebuild index: {str(e)}")
    return {"status": "ok", "reindexed": len(texts)}


@router.delete("/index", summary="Clear vector index for a week (admin)")
def clear_week_index(week_id: int = Query(..., ge=1), user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    reset_index(week_id)
    return {"status": "cleared"}

