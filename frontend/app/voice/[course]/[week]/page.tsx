"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import VoiceOrb from "@/components/VoiceOrb";
import TimerBar from "@/components/TimerBar";
import { endSession, sendVoiceUtterance, startSession } from "@/lib/api";
import BackButton from "@/components/BackButton";

type Props = { params: { course: string; week: string } };

type SessionStatus = "idle" | "recording" | "processing" | "playing" | "awaiting-user";

type Turn = {
  id: number;
  student: string;
  assistant: string;
};

type TurnMetadata = {
  turn_id: number;
  student_transcript: string;
  assistant_transcript: string;
};

export default function VoicePage({ params }: Props) {
  const weekNum = Number(params.week);
  const validWeekNum = Number.isFinite(weekNum) && weekNum > 0 ? weekNum : 1;

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const ready = sessionId != null;

  const handleStart = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const session = await startSession(validWeekNum);
      setSessionId(session.id);
      setExpiresAt(session.expires_at);
      setStatus("awaiting-user");
      setTurns([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setStarting(false);
    }
  }, [validWeekNum]);

  const stopStreaming = useCallback(() => {
    const controller = activeControllerRef.current;
    if (controller) {
      controller.abort();
      activeControllerRef.current = null;
    }
  }, []);

  const handleEnd = useCallback(async () => {
    stopStreaming();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setAudioBlob(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    try {
      if (sessionId != null) {
        await endSession(sessionId);
      }
    } catch {}
    setSessionId(null);
    setExpiresAt(null);
    setDraft("");
    setStatus("idle");
  }, [sessionId, stopStreaming]);

  useEffect(() => {
    if (!expiresAt || !sessionId) return;
    const endTs = new Date(expiresAt).getTime();
    const interval = window.setInterval(() => {
      if (Date.now() >= endTs) {
        handleEnd();
      }
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [expiresAt, sessionId, handleEnd]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {}
      }
    };
  }, []);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "recording":
        return "Recording";
      case "processing":
        return "Processing";
      case "playing":
        return "Playing";
      case "awaiting-user":
        return "Ready";
      default:
        return "Idle";
    }
  }, [status]);

  const handleSubmit = useCallback(async () => {
    if (!ready) {
      setError("Start a session before sending a question.");
      return;
    }
    const question = draft.trim();
    if (!question) {
      setError("Transcription is in progress—please type your question for now.");
      return;
    }

    setError(null);
    setStatus("processing");
    const controller = new AbortController();
    activeControllerRef.current = controller;

    let metadata: TurnMetadata | null = null;
    try {
      let audioBase64: string | undefined;
      let mimeType: string | undefined;
      
      if (audioBlob) {
        const buffer = await audioBlob.arrayBuffer();
        audioBase64 = arrayBufferToBase64(buffer);
        mimeType = audioBlob.type || "audio/webm";
      }
      
      const response = await sendVoiceUtterance({
        sessionId,
        transcript: question,
        audioBase64,
        mimeType,
        signal: controller.signal,
      });

      metadata = decodeTurnHeader(response.headers.get("X-Voice-Turn"));
      setTurns((prev) => [
        ...prev,
        {
          id: metadata?.turn_id ?? Date.now(),
          student: metadata?.student_transcript ?? question,
          assistant: metadata?.assistant_transcript ?? "Generating response…",
        },
      ]);
      setDraft("");
      setAudioBlob(null);

      if (audioRef.current) {
        setStatus("playing");
        await streamAudioToElement(response, audioRef.current, controller.signal);
      }

      if (metadata) {
        setTurns((prev) => (
          prev.map((turn) =>
            turn.id === metadata?.turn_id
              ? { ...turn, assistant: metadata.assistant_transcript }
              : turn,
          )
        ));
      }

      setStatus("awaiting-user");
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      if (!aborted) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setTurns((prev) => [
          ...prev,
          {
            id: metadata?.turn_id ?? Date.now(),
            student: metadata?.student_transcript ?? question,
            assistant: metadata?.assistant_transcript ?? "Sorry, something went wrong.",
          },
        ]);
      }
      setStatus(ready ? "awaiting-user" : "idle");
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
    }
  }, [ready, draft, sessionId, audioBlob]);

  const startRecording = useCallback(async () => {
    if (!ready) {
      setError("Start a session before recording.");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const mediaRecorder = new MediaRecorder(stream, preferredMime ? { mimeType: preferredMime } : undefined);
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      setAudioBlob(null);
      mediaRecorder.start();
      setIsRecording(true);
      setStatus("recording");
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access microphone";
      setError(message);
    }
  }, [ready]);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setStatus("awaiting-user");
    }
  }, [isRecording]);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <BackButton />
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
        Voice Session – {params.course} / Week {validWeekNum}
      </h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>
        Turn-based tutoring with synthesized audio replies. One question at a time.
      </p>

      {error && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          background: "#2a1111",
          border: "1px solid #5a2222",
          borderRadius: 8,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 360px", minWidth: 320 }}>
          <VoiceOrb />
          {expiresAt && <TimerBar endsAt={expiresAt} />}
        </div>
        <div style={{ flex: "1 1 360px", minWidth: 320 }}>
          <section style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              {ready ? (
                <button onClick={handleEnd} style={btnStyle}>
                  End Session
                </button>
              ) : (
                <button disabled={starting} onClick={handleStart} style={btnStyle}>
                  {starting ? "Starting…" : "Start Session"}
                </button>
              )}
            </div>
            <div style={{ marginTop: 8, opacity: 0.8, fontSize: 14 }}>Status: {statusLabel}</div>
            <audio ref={audioRef} autoPlay playsInline />
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Ask something</h2>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={ready ? "Record audio or type your question…" : "Start a session to enable questions."}
              style={{
                width: "100%",
                minHeight: 96,
                padding: 12,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(20,20,20,0.4)",
                resize: "vertical",
                color: "#fff",
              }}
              disabled={!ready || status === "processing" || status === "playing" || isRecording}
            />
            {audioBlob && (
              <div style={{ marginTop: 8, padding: 8, background: "rgba(40,40,40,0.5)", borderRadius: 6 }}>
                <span style={{ fontSize: 14, opacity: 0.8 }}>Audio recorded ({Math.round(audioBlob.size / 1024)}KB)</span>
                <button
                  onClick={() => setAudioBlob(null)}
                  style={{ marginLeft: 12, fontSize: 12, padding: "2px 8px", cursor: "pointer" }}
                >
                  Clear
                </button>
              </div>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  style={{ ...btnStyle, background: "#a62626" }}
                >
                  Stop Recording
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={!ready || status === "processing" || status === "playing"}
                  style={btnStyle}
                >
                  Record Audio
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!ready || status === "processing" || status === "playing" || isRecording || !draft.trim()}
                style={btnStyle}
              >
                Send Turn
              </button>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Conversation</h2>
            <div style={{
              maxHeight: 260,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}>
              {turns.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No turns yet. Ask a question to begin.</div>
              ) : (
                turns.map((turn) => (
                  <div key={turn.id} style={{
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: 12,
                    background: "rgba(15,15,15,0.6)",
                  }}>
                    <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 4 }}>You</div>
                    <div style={{ marginBottom: 8 }}>{turn.student}</div>
                    <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 4 }}>Tutor</div>
                    <div>{turn.assistant}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function decodeTurnHeader(header: string | null): TurnMetadata | null {
  if (!header) return null;
  try {
    const decoded = atob(header);
    const parsed = JSON.parse(decoded);
    if (
      typeof parsed?.turn_id === "number" &&
      typeof parsed?.student_transcript === "string" &&
      typeof parsed?.assistant_transcript === "string"
    ) {
      return parsed as TurnMetadata;
    }
  } catch (error) {
    console.warn("Failed to decode X-Voice-Turn header", error);
  }
  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    let chunkString = "";
    for (let j = 0; j < chunk.length; j += 1) {
      chunkString += String.fromCharCode(chunk[j]);
    }
    binary += chunkString;
  }
  return btoa(binary);
}

async function streamAudioToElement(response: Response, element: HTMLAudioElement, signal?: AbortSignal) {
  const body = response.body;
  if (!body) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    element.src = url;
    await element.play().catch(() => undefined);
    URL.revokeObjectURL(url);
    return;
  }

  const mediaSource = new MediaSource();
  const objectUrl = URL.createObjectURL(mediaSource);
  const reader = body.getReader();
  const queue: Uint8Array[] = [];
  let isDone = false;
  let abortListener: (() => void) | null = null;

  const cleanup = () => {
    try {
      reader.cancel().catch(() => undefined);
    } catch {}
    try {
      URL.revokeObjectURL(objectUrl);
    } catch {}
    if (signal && abortListener) {
      signal.removeEventListener("abort", abortListener);
    }
  };

  element.src = objectUrl;

  await new Promise<void>((resolve, reject) => {
    abortListener = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (signal) {
      if (signal.aborted) {
        abortListener();
        return;
      }
      signal.addEventListener("abort", abortListener, { once: true });
    }

    mediaSource.addEventListener("sourceopen", () => {
      if (!MediaSource.isTypeSupported("audio/mpeg")) {
        cleanup();
        reject(new Error("Browser cannot stream audio/mpeg."));
        return;
      }

      const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");

      element.play().catch(() => undefined);

      const flush = () => {
        if (queue.length === 0 || sourceBuffer.updating) return;
        const next = queue.shift();
        if (!next) return;
        try {
          sourceBuffer.appendBuffer(next);
        } catch (error) {
          cleanup();
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };

      const read = () => {
        reader
          .read()
          .then(({ value, done }) => {
            if (done) {
              isDone = true;
              if (!sourceBuffer.updating && queue.length === 0) {
                try {
                  mediaSource.endOfStream();
                } catch {}
                cleanup();
                resolve();
              }
              return;
            }
            if (value) {
              queue.push(value);
              flush();
            }
            read();
          })
          .catch((error) => {
            cleanup();
            reject(error instanceof Error ? error : new Error(String(error)));
          });
      };

      sourceBuffer.addEventListener("updateend", () => {
        if (queue.length > 0) {
          flush();
        } else if (isDone) {
          try {
            mediaSource.endOfStream();
          } catch {}
          cleanup();
          resolve();
        }
      });

      read();
    }, { once: true });

    mediaSource.addEventListener("error", (event) => {
      cleanup();
      reject(event instanceof Error ? event : new Error("MediaSource error."));
    });
  });
}

const btnStyle: CSSProperties = {
  appearance: "none",
  background: "#841617",
  color: "#fff",
  border: 0,
  borderRadius: 8,
  padding: "10px 16px",
  cursor: "pointer",
  minWidth: 140,
  transition: "opacity 160ms ease",
};
