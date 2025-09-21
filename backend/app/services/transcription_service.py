from __future__ import annotations

import base64
import io
import tempfile
from typing import Optional

import whisper


class TranscriptionError(Exception):
    """Base error for transcription service failures."""


_whisper_model: Optional[whisper.Whisper] = None


def get_whisper_model(model_size: str = "base") -> whisper.Whisper:
    """Get or initialize the Whisper model singleton."""
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = whisper.load_model(model_size)
    return _whisper_model


def transcribe_audio(
    audio_base64: str,
    mime_type: Optional[str] = None,
    language: str = "en",
) -> str:
    """Transcribe audio from base64-encoded data using Whisper.
    
    Args:
        audio_base64: Base64-encoded audio data
        mime_type: MIME type of the audio (e.g., "audio/webm", "audio/wav")
        language: Language code for transcription (default: "en")
    
    Returns:
        Transcribed text
    
    Raises:
        TranscriptionError: If transcription fails
    """
    try:
        audio_bytes = base64.b64decode(audio_base64)
        
        with tempfile.NamedTemporaryFile(suffix=_get_audio_suffix(mime_type), delete=False) as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_file.flush()
            
            model = get_whisper_model()
            result = model.transcribe(
                tmp_file.name,
                language=language,
                fp16=False,
            )
            
            text = result.get("text", "").strip()
            if not text:
                raise TranscriptionError("No speech detected in audio")
            
            return text
            
    except Exception as exc:
        if isinstance(exc, TranscriptionError):
            raise
        raise TranscriptionError(f"Failed to transcribe audio: {exc}") from exc


def _get_audio_suffix(mime_type: Optional[str]) -> str:
    """Get file suffix based on MIME type."""
    if not mime_type:
        return ".wav"
    
    mime_to_suffix = {
        "audio/webm": ".webm",
        "audio/wav": ".wav", 
        "audio/x-wav": ".wav",
        "audio/mp3": ".mp3",
        "audio/mpeg": ".mp3",
        "audio/ogg": ".ogg",
        "audio/opus": ".opus",
        "audio/flac": ".flac",
        "audio/m4a": ".m4a",
    }
    
    return mime_to_suffix.get(mime_type.lower(), ".wav")