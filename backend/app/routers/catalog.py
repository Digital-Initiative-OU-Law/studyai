from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth import get_db
from ..models import Course, Week


router = APIRouter(tags=["catalog"])


@router.get("/courses", summary="List courses")
def list_courses(db: Session = Depends(get_db)):
    rows = db.query(Course).order_by(Course.code.asc()).all()
    return [
        {"id": c.id, "code": c.code, "name": c.name}
        for c in rows
    ]


@router.get("/weeks", summary="List weeks for a course")
def list_weeks(course_id: int = Query(..., ge=1), db: Session = Depends(get_db)):
    rows = db.query(Week).filter(Week.course_id == course_id).order_by(Week.number.asc()).all()
    return [
        {"id": w.id, "week_number": w.number, "title": w.title}
        for w in rows
    ]

