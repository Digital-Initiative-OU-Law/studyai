from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth import get_db
from ..models import Course, Week


router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/courses", summary="List courses")
def list_courses(db: Session = Depends(get_db)):
    try:
        rows = db.query(Course).order_by(Course.code.asc()).all()
        return [
            {"id": c.id, "code": c.code, "name": c.name}
            for c in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch courses: {str(e)}")


@router.get("/weeks", summary="List weeks for a course")
def list_weeks(course_id: int = Query(..., ge=1), db: Session = Depends(get_db)):
    try:
        # Validate course exists
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        rows = (
            db.query(Week)
            .filter(Week.course_id == course_id)
            .order_by(Week.number.asc())
            .all()
        )
        return [
            {"id": w.id, "week_number": w.number, "title": w.title}
            for w in rows
        ]
    except HTTPException:
        # Propagate known HTTP errors (e.g. 404)
        raise
    except Exception as e:
        # Catch any other unexpected errors
        raise HTTPException(status_code=500, detail=f"Failed to fetch weeks: {e}")

