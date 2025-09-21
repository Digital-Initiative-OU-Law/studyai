from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..services.voice_service import mint_webrtc_token


router = APIRouter(prefix="/voice", tags=["voice"])


from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

@router.get("/token", summary="Mint an ElevenLabs WebRTC token")
def get_voice_token(voice_id: str | None = Query(default=None)):
    try:
        data = mint_webrtc_token(voice_id)
        return JSONResponse(content=data, headers={"Cache-Control": "no-store"})
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

