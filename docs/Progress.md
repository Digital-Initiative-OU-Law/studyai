# StudyAI — Build Log, Warnings, and Workarounds

This document chronicles pitfalls, decisions, and progress while building the StudyAI prototype. It replaces the earlier multi‑service progress style with a focused, no‑Postgres, no‑OpenAI plan.

---

## 0) Scope Summary

- Skip dedicated test suite and `test/` folder for this prototype.
- Replace Postgres/pgvector with local SQLite + local vector index (FAISS/Chroma).
- Replace OpenAI with Anthropic Claude for all LLM reasoning.
- Use LangChain for ingestion (PDF extract/chunk/embed), retrieval, and prompt composition.
- ElevenLabs remains the realtime voice provider via WebRTC; backend mints tokens.

---

## 1) Environment Checklist

- Root `.env` only (no per‑folder `.env`).
- Required keys:
  - `ANTHROPIC_API_KEY=...`
  - `ELEVEN_API_KEY=...`
  - `JWT_SECRET=...`
  - `SESSION_MAX_SECONDS=300`
  - `NEXT_PUBLIC_API_BASE=http://localhost:8000`
  - `NEXT_PUBLIC_VOICE_IDS=VOICE_ID_1,VOICE_ID_2,...`
- Deleted keys:
  - `OPENAI_API_KEY` (remove from environment and code).

---

## 2) Warnings, Problems, and Workarounds

- Embeddings without OpenAI
  - Problem: Claude does not provide embeddings.
  - Workaround: Use a local SentenceTransformers model (e.g., `all-MiniLM-L6-v2`) through LangChain’s embeddings interface. Cache on disk; allow model override via env/config.

- Local vector index durability
  - Problem: FAISS/Chroma stores indexes on disk; schema drift or file moves can corrupt state.
  - Workaround: Version index per week; include rebuild endpoints; persist raw chunks in SQLite to enable full reindex.

- WebRTC token timing
  - Problem: Token expiry or network hiccups during session start.
  - Workaround: Add retry with a fresh token; expose reconnect UI with clear status; don’t auto‑reconnect in a loop without backoff.

- PDF text quality
  - Problem: Scanned PDFs degrade extraction quality.
  - Workaround: Detect low OCR confidence; optionally integrate lightweight OCR (e.g., Tesseract) later; mark suspect chunks to down‑weight in retrieval.

- Single `.env` policy
  - Problem: Tooling often defaults to per‑app `.env` files.
  - Workaround: Document the policy; plumb values explicitly from root `.env`. For Next.js, mirror only safe values as `NEXT_PUBLIC_*` at runtime.

- Session cutoff enforcement
  - Problem: Frontend timers can be bypassed.
  - Workaround: Enforce hard 5‑minute limit server‑side; terminate voice session and finalize transcript/audio on the backend.

---

## 3) Build Progress Tracker (Granular)

Legend: [ ] pending, [~] in progress, [x] done

### A) Backend Foundations
- [x] Choose SQLite for relational store
- [x] Choose FAISS/Chroma for vector index
- [x] Define tables: users, courses, weeks, readings, chunks, summaries, conversations, audio_blobs
- [x] Decide on job status table for ingestion tracking
- [ ] Implement base FastAPI app and health endpoint
- [ ] Implement auth (login, JWT)
- [ ] Implement CORS for `http://localhost:3001`

### B) Ingestion Pipeline (LangChain)
- [x] Decide on `pypdf` for extraction
- [x] Decide on SentenceTransformers model (`all-MiniLM-L6-v2`) for embeddings
- [x] Chunking strategy (e.g., 1k chars, 200 overlap)
- [x] Index layout per week (namespace)
- [ ] Endpoint: `POST /readings/upload?week_id=...` (multipart)
- [ ] Job orchestration: queued → running → done|error
- [ ] Endpoint: `GET /jobs/{id}` for progress

### C) Summaries and Tutoring (Claude)
- [x] Prompt templates for weekly summary bullets
- [ ] Endpoint: `GET /summaries?week_id=...`
- [ ] Cache summaries by week; invalidate on new upload

### D) Voice Session
- [x] Decide on ElevenLabs realtime and token mint flow
- [ ] Endpoint: `GET /voice/token?voice_id=...`
- [ ] Endpoint: `POST /sessions/start`
- [ ] Endpoint: `POST /sessions/{id}/end` with transcript/audio
- [ ] Server‑side timeout enforcement (300 seconds)

### E) Frontend Core
- [x] App shell and theme plan
- [ ] `/login` page and API wiring
- [ ] `/role` page
- [ ] `/student` with Course/Week/Voice pickers
- [ ] `/professor` with DragDropUpload and job status panel
- [ ] `/voice/[course]/[week]` with WebRTC, VoiceOrb, TranscriptPane, TimerBar

### F) Polishing
- [ ] Error toasts and retry UX
- [ ] Basic accessibility sweep (focus, ARIA)
- [ ] Mobile responsiveness pass

---

## 4) Decisions Log (Architecture)

- Use SQLite for app data to simplify local dev and avoid Docker.
- Use FAISS (default) with a simple directory per week for vector storage; allow switching to Chroma via env.
- Keep all Claude prompts in a single module for auditing and iteration.
- Store raw PDF bytes on disk and metadata in SQLite (avoid DB BLOBS for easier file inspection); path stored in `readings` table.
- Keep ingestion synchronous for small PDFs; switch to background tasks if processing time grows.

---

## 5) Manual Validation Plan (No Test Suite)

- Backend
  - Upload a small PDF; ensure job transitions to `done` and chunks/summaries are created.
  - Call `GET /summaries?week_id` and verify stable output across runs.
  - Start a session and confirm server‑side timeout closes it at 5 minutes.

- Frontend
  - Complete login → role → student flow; start a session.
  - Validate professor upload shows status transitions.
  - Confirm transcript updates and the TimerBar ends the session.

---

## 6) Known Gaps / Future Work

- OCR for scanned PDFs.
- Background worker for ingestion at scale.
- Admin role and UI for role management.
- Export transcripts and audio blobs; download link from professor dashboard.

---

## 7) Operational Notes

- Rebuild index endpoint: `/maintenance/reindex?week_id=...` (admin‑guarded) to regenerate vectors from stored chunks.
- Health: `/health` returns DB status, vector index reachability, Claude connectivity, and ElevenLabs ping.
- Logs: redact all secrets; tag logs with session ID for traceability.

