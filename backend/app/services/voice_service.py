from __future__ import annotations

import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import requests

from ..config import settings


ELEVEN_REALTIME_SESSIONS_URL = "https://api.elevenlabs.io/v1/realtime/sessions"


def mint_webrtc_token(voice_id: Optional[str] = None) -> dict:
    """
    Requests a short-lived token for ElevenLabs Realtime WebRTC.

    Returns a dict like { token: string, expires_at: iso8601 } on success.
    If ELEVEN_API_KEY is not configured or request fails, raises RuntimeError.
    """
    api_key = settings.ELEVEN_API_KEY
    if not api_key:
        raise RuntimeError("ELEVEN_API_KEY not configured")

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }
    payload = {"voice_id": voice_id} if voice_id else {}

    resp = requests.post(ELEVEN_REALTIME_SESSIONS_URL, headers=headers, json=payload, timeout=10)
    if resp.status_code >= 400:
        raise RuntimeError(f"ElevenLabs token request failed: {resp.status_code} {resp.text}")
    data = resp.json()

    # The API may return a structure containing a client_secret/token. Normalize keys.
    token = data.get("token") or data.get("client_secret") or data.get("access_token")
    if not token:
        raise RuntimeError("ElevenLabs response missing token")

    expires_at = (datetime.utcnow() + timedelta(seconds=settings.SESSION_MAX_SECONDS)).isoformat() + "Z"
    return {"token": token, "expires_at": expires_at}

