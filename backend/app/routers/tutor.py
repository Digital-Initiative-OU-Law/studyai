from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import get_db
from ..services.tutor_service import answer_question

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tutor", tags=["tutor"])


class TutorQuery(BaseModel):
    week_id: int = Field(..., ge=1)
    question: str = Field(..., min_length=3, max_length=2000)


@router.post("/query", summary="Ask a question about a week's readings")
def tutor_query(payload: TutorQuery, db: Session = Depends(get_db)):
    try:
        # db reserved for future user/session checks; retrieval uses local vector index
        result = answer_question(week_id=payload.week_id, question=payload.question)
        return {"answer": result}
    except Exception:
        logger.exception("tutor_query failed for week_id=%s", payload.week_id)
        raise HTTPException(status_code=500, detail="Internal server error")

