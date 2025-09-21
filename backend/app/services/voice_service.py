from __future__ import annotations

import base64
import json
from datetime import datetime, timedelta
from typing import Iterable, Optional

import requests
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Conversation, ConversationTurn
from .transcription_service import transcribe_audio, TranscriptionError as AudioTranscriptionError

ELEVEN_TTS_STREAM_ROOT = "https://api.elevenlabs.io/v1/text-to-speech"


class VoiceServiceError(Exception):
    """Base error for voice service failures."""


class SessionExpiredError(VoiceServiceError):
    """Raised when a conversation session has expired or ended."""


class TranscriptMissingError(VoiceServiceError):
    """Raised when no transcript or audio text could be derived."""


class VoiceStreamError(VoiceServiceError):
    """Raised when ElevenLabs streaming fails."""


def ensure_session_active(conversation: Conversation) -> None:
    """Ensure the session associated with the conversation is still active."""
    if conversation.ended_at:
        raise SessionExpiredError("Session already ended")
    expires_at = conversation.started_at + timedelta(seconds=settings.SESSION_MAX_SECONDS)
    if datetime.utcnow() >= expires_at:
        raise SessionExpiredError("Session expired")


def coerce_transcript(transcript: Optional[str], audio_base64: Optional[str] = None, mime_type: Optional[str] = None) -> str:
    """Validate and normalize the student transcript text, or transcribe from audio.
    
    Args:
        transcript: Optional text transcript
        audio_base64: Optional base64-encoded audio data
        mime_type: Optional MIME type of the audio
    
    Returns:
        The transcript text
    
    Raises:
        TranscriptMissingError: If no transcript could be derived
    """
    if transcript:
        cleaned = transcript.strip()
        if cleaned:
            return cleaned
    
    if audio_base64:
        try:
            transcribed = transcribe_audio(audio_base64, mime_type)
            return transcribed
        except AudioTranscriptionError as exc:
            raise TranscriptMissingError(f"Audio transcription failed: {exc}") from exc
    
    raise TranscriptMissingError("Either transcript text or audio data is required")


def record_turn(
    db: Session,
    *,
    conversation: Conversation,
    student_transcript: str,
    assistant_transcript: str,
    metadata: Optional[dict] = None,
) -> ConversationTurn:
    """Persist a conversation turn and return the saved record."""
    payload = metadata or {}
    metadata_json = json.dumps(payload, ensure_ascii=False) if payload else None
    turn = ConversationTurn(
        conversation_id=conversation.id,
        student_transcript=student_transcript,
        assistant_transcript=assistant_transcript,
        metadata_json=metadata_json,
    )
    try:
        db.add(turn)
        db.commit()
        db.refresh(turn)
    except Exception:
        db.rollback()
        raise
    return turn


def encode_turn_metadata(turn: ConversationTurn, student_transcript: str, assistant_transcript: str) -> str:
    """Pack turn metadata into a base64-encoded JSON header."""
    payload = {
        "turn_id": turn.id,
        "student_transcript": student_transcript,
        "assistant_transcript": assistant_transcript,
    }
    raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    return base64.b64encode(raw).decode("ascii")


def stream_tts_audio(*, text: str, voice_id: Optional[str] = None, model_id: Optional[str] = None) -> Iterable[bytes]:
    """Stream audio bytes from ElevenLabs for the supplied text."""
    api_key = settings.ELEVEN_API_KEY
    if not api_key:
        raise VoiceStreamError("ElevenLabs API key not configured")

    resolved_voice_id = voice_id or settings.ELEVEN_DEFAULT_VOICE_ID
    if not resolved_voice_id:
        raise VoiceStreamError("No ElevenLabs voice id provided")

    resolved_model = model_id or settings.ELEVEN_MODEL_ID
    url = f"{ELEVEN_TTS_STREAM_ROOT}/{resolved_voice_id}/stream"
    headers = {
        "xi-api-key": api_key,
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": resolved_model,
    }

    try:
        with requests.post(url, headers=headers, json=payload, stream=True, timeout=30) as resp:
            if resp.status_code >= 400:
                snippet = resp.text[:512]
                raise VoiceStreamError(f"ElevenLabs streaming failed ({resp.status_code}): {snippet}")
            for chunk in resp.iter_content(chunk_size=4096):
                if chunk:
                    yield chunk
    except requests.RequestException as exc:
        raise VoiceStreamError(f"ElevenLabs request error: {exc}") from exc
