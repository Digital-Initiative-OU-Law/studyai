"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import VoiceOrb from "@/components/VoiceOrb";
import TimerBar from "@/components/TimerBar";
import { getVoiceToken, startSession, endSession } from "@/lib/api";
import { connectElevenLabsRealtime } from "@/lib/webrtc";

type Props = { params: { course: string; week: string } };

export default function VoicePage({ params }: Props) {
  const weekNum = Number(params.week);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [pc, setPc] = useState<{ close: () => void } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleStart = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const s = await startSession(Number.isFinite(weekNum) ? weekNum : undefined);
      setSessionId(s.id);
      setExpiresAt(s.expires_at);
      const v = await getVoiceToken();
      const conn = await connectElevenLabsRealtime({
        token: v.token,
        onRemoteTrack: (remote) => {
          if (audioRef.current) {
            audioRef.current.srcObject = remote;
            audioRef.current.play().catch(() => {});
          }
        }
      });
      setPc(conn);
      setConnected(true);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setConnecting(false);
    }
  }, [weekNum]);

  const handleEnd = useCallback(async () => {
    try {
      pc?.close?.();
      if (sessionId != null) {
        await endSession(sessionId);
      }
    } catch {}
    setConnected(false);
    setSessionId(null);
    setExpiresAt(null);
    setPc(null);
  }, [pc, sessionId]);

  // Auto-end when expiresAt passes
  useEffect(() => {
    if (!expiresAt || !sessionId) return;
    const end = new Date(expiresAt).getTime();
    const id = setInterval(() => {
      if (Date.now() >= end) {
        handleEnd();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, sessionId, handleEnd]);

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Voice Session — {params.course} / Week {params.week}</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>Five-minute session with pulsing orb and realtime audio (stub).
      </p>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, background: '#2a1111', border: '1px solid #5a2222', borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 360px', minWidth: 320 }}>
          <VoiceOrb />
          {expiresAt && <TimerBar endsAt={expiresAt} />}
        </div>
        <div style={{ minWidth: 240 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {!connected ? (
              <button disabled={connecting} onClick={handleStart} style={btnStyle}>
                {connecting ? 'Connecting…' : 'Start Session'}
              </button>
            ) : (
              <button onClick={handleEnd} style={btnStyle}>End Session</button>
            )}
          </div>
          <div style={{ marginTop: 16, opacity: 0.8, fontSize: 14 }}>
            Status: {connected ? 'Connected' : connecting ? 'Connecting…' : 'Idle'}
          </div>
          <audio ref={audioRef} autoPlay playsInline />
        </div>
      </div>
    </main>
  );
}

const btnStyle: CSSProperties = {
  appearance: 'none',
  background: '#841617',
  color: '#fff',
  border: 0,
  borderRadius: 8,
  padding: '10px 16px',
  cursor: 'pointer',
};
