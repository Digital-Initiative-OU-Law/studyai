from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    UniqueConstraint,
    ForeignKey,
    Index,
    CheckConstraint,
)
from sqlalchemy.orm import relationship, Mapped

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    email: Mapped[str] = Column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = Column(String(255), nullable=False)
    role: Mapped[str] = Column(String(50), default="student", nullable=False)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    courses: Mapped[List["Course"]] = relationship("Course", back_populates="professor", cascade="all, delete-orphan")
    summaries: Mapped[List["Summary"]] = relationship("Summary", back_populates="created_by", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = Column(Integer, primary_key=True)
    name: Mapped[str] = Column(String(255), nullable=False)
    code: Mapped[str] = Column(String(64), nullable=False, unique=True)
    professor_id: Mapped[int] = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    professor: Mapped["User"] = relationship("User", back_populates="courses")
    weeks: Mapped[List["Week"]] = relationship("Week", back_populates="course", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_courses_professor_id", "professor_id"),
    )


class Week(Base):
    __tablename__ = "weeks"

    id: Mapped[int] = Column(Integer, primary_key=True)
    course_id: Mapped[int] = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    number: Mapped[int] = Column(Integer, nullable=False)
    title: Mapped[Optional[str]] = Column(String(255))
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    course: Mapped["Course"] = relationship("Course", back_populates="weeks")
    readings: Mapped[List["Reading"]] = relationship("Reading", back_populates="week", cascade="all, delete-orphan")
    summaries: Mapped[List["Summary"]] = relationship("Summary", back_populates="week", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="week", cascade="all, delete-orphan")
    jobs: Mapped[List["Job"]] = relationship("Job", back_populates="week", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_weeks_course_id", "course_id"),
        Index("idx_weeks_course_number", "course_id", "number"),
    )


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = Column(Integer, primary_key=True)
    kind: Mapped[str] = Column(String(64), nullable=False)  # e.g., ingestion
    status: Mapped[str] = Column(String(32), nullable=False, default="queued")
    progress: Mapped[int] = Column(Integer, nullable=False, default=0)
    error: Mapped[Optional[str]] = Column(Text)
    week_id: Mapped[Optional[int]] = Column(Integer, ForeignKey("weeks.id", ondelete="SET NULL"), index=True)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    week: Mapped[Optional["Week"]] = relationship("Week", back_populates="jobs")

    # Indexes
    __table_args__ = (
        Index("idx_jobs_week_id", "week_id"),
        Index("idx_jobs_status", "status"),
        Index("idx_jobs_kind", "kind"),
        CheckConstraint("status IN ('queued', 'running', 'done', 'error')", name='valid_status'),
        CheckConstraint("progress >= 0 AND progress <= 100", name='valid_progress'),
    )


class Reading(Base):
    __tablename__ = "readings"

    id: Mapped[int] = Column(Integer, primary_key=True)
    week_id: Mapped[int] = Column(Integer, ForeignKey("weeks.id", ondelete="CASCADE"), nullable=False, index=True)
    filename: Mapped[str] = Column(String(512), nullable=False)
    file_path: Mapped[str] = Column(String(1024), nullable=False)
    uploaded_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    week: Mapped["Week"] = relationship("Week", back_populates="readings")
    chunks: Mapped[List["Chunk"]] = relationship("Chunk", back_populates="reading", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_readings_week_id", "week_id"),
    )


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[int] = Column(Integer, primary_key=True)
    reading_id: Mapped[int] = Column(Integer, ForeignKey("readings.id", ondelete="CASCADE"), nullable=False, index=True)
    idx: Mapped[int] = Column(Integer, nullable=False)
    content: Mapped[str] = Column(Text, nullable=False)
    meta_json: Mapped[Optional[str]] = Column(Text)

    # Relationships
    reading: Mapped["Reading"] = relationship("Reading", back_populates="chunks")

    # Indexes
    __table_args__ = (
        Index("idx_chunks_reading_id", "reading_id"),
        Index("idx_chunks_reading_idx", "reading_id", "idx"),
    )


class Summary(Base):
    __tablename__ = "summaries"

    id: Mapped[int] = Column(Integer, primary_key=True)
    week_id: Mapped[int] = Column(Integer, ForeignKey("weeks.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_id: Mapped[int] = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content: Mapped[str] = Column(Text, nullable=False)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    week: Mapped["Week"] = relationship("Week", back_populates="summaries")
    created_by: Mapped["User"] = relationship("User", back_populates="summaries")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = Column(Integer, primary_key=True)
    user_id: Mapped[int] = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    week_id: Mapped[int] = Column(Integer, ForeignKey("weeks.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id: Mapped[str] = Column(String(255), nullable=False, unique=True)
    started_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at: Mapped[Optional[datetime]] = Column(DateTime)
    duration_seconds: Mapped[Optional[int]] = Column(Integer)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="conversations")
    week: Mapped["Week"] = relationship("Week", back_populates="conversations")

    # Indexes
    __table_args__ = (
        Index("idx_conversations_user_id", "user_id"),
        Index("idx_conversations_week_id", "week_id"),
        Index("idx_conversations_session_id", "session_id"),
    )


class AudioBlob(Base):
    __tablename__ = "audio_blobs"

    id: Mapped[int] = Column(Integer, primary_key=True)
    conversation_id: Mapped[int] = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    blob_data: Mapped[bytes] = Column(Text, nullable=False)  # Store as base64 or binary
    timestamp: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)
    duration_ms: Mapped[Optional[int]] = Column(Integer)

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation")

    # Indexes
    __table_args__ = (
        Index("idx_audio_blobs_conversation_id", "conversation_id"),
        Index("idx_audio_blobs_timestamp", "timestamp"),
    )
