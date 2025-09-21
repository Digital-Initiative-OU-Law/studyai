from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..config import settings
from ..models import Conversation, User
from ..services import voice_service
from ..services.tutor_service import answer_question

router = APIRouter(prefix="/voice", tags=["voice"])


class VoiceUtterance(BaseModel):
    session_id: int = Field(..., ge=1)
    transcript: str | None = None
    audio_base64: str | None = None
    mime_type: str | None = None
    voice_id: str | None = None
    model_id: str | None = None


@router.post("/utterances", response_class=StreamingResponse, summary="Process a student utterance and stream synthesized audio")
def create_voice_utterance(
    payload: VoiceUtterance,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conversation = db.query(Conversation).filter(Conversation.id == payload.session_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Session not found")
    if conversation.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    try:
        voice_service.ensure_session_active(conversation)
    except voice_service.SessionExpiredError as exc:
        if not conversation.ended_at:
            conversation.ended_at = datetime.utcnow()
            conversation.duration_seconds = settings.SESSION_MAX_SECONDS
            db.commit()
        raise HTTPException(status_code=440, detail=str(exc))

    try:
        student_text = voice_service.coerce_transcript(
            payload.transcript,
            payload.audio_base64,
            payload.mime_type
        )
    except voice_service.TranscriptMissingError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if not conversation.week_id:
        raise HTTPException(status_code=400, detail="Session is missing week context")

    tutor_reply = answer_question(week_id=conversation.week_id, question=student_text)
    if not tutor_reply:
        raise HTTPException(status_code=502, detail="Claude failed to generate a reply")

    metadata = {}
    if payload.voice_id:
        metadata["voice_id"] = payload.voice_id
    if payload.model_id:
        metadata["model_id"] = payload.model_id

    turn = voice_service.record_turn(
        db,
        conversation=conversation,
        student_transcript=student_text,
        assistant_transcript=tutor_reply,
        metadata=metadata or None,
    )
    header_value = voice_service.encode_turn_metadata(turn, student_text, tutor_reply)

    try:
        audio_stream = voice_service.stream_tts_audio(
            text=tutor_reply,
            voice_id=payload.voice_id,
            model_id=payload.model_id,
        )
    except voice_service.VoiceStreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return StreamingResponse(
        audio_stream,
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-store",
            "X-Voice-Turn": header_value,
        },
    )


@router.get("/health", summary="ElevenLabs readiness probe")
def voice_healthcheck():
    if not settings.ELEVEN_API_KEY:
        raise HTTPException(status_code=503, detail="ElevenLabs key missing")
    return {"status": "ok"}
