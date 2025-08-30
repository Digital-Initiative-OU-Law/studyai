from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .. import schemas
from ..auth import (
    get_db,
    get_password_hash,
    authenticate_user,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from ..models import User


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut, summary="Developer register (local)")
def register_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    normalized_email = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Ignore client-supplied role; assign a safe default or validate against an allowlist.
    default_role = "student"
    user = User(
        email=normalized_email,
        password_hash=get_password_hash(payload.password),
        role=default_role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.TokenResponse, summary="Login and obtain JWT")
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(subject=str(user.id), expires_delta=access_token_expires)
    return schemas.TokenResponse(access_token=token, expires_in=int(access_token_expires.total_seconds()))

