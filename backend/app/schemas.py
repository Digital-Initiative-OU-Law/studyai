from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = "student"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)



