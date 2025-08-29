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

### 2.1) Doc Review Findings (2025-08-29)
- Plan.md contains "Claude embeddings" and suggests "Claude API (Reasoning & Embeddings)".
  - Resolution: No remote embedding APIs. Use local SentenceTransformers only via LangChain. Update Plan.md to remove Claude embedding references.
- ElevenLabs env var naming mismatch across docs (`ELEVENLABS_API_KEY` vs `ELEVEN_API_KEY`).
  - Resolution: Standardize on `ELEVEN_API_KEY` per Agents.md. Update docs/elevenlabs.md and Backend.md examples to match; ensure backend config reads `ELEVEN_API_KEY`.
- ngrok.md mentions OpenAI in troubleshooting.
  - Resolution: Remove OpenAI mentions to avoid confusion; ngrok is provider-agnostic here. Keep only ngrok-related guidance.
- Backend.md largely aligns (FastAPI + SQLite + LangChain + local embeddings; Chroma vector store shown).
  - Action: Ensure FAISS is also an option; default to FAISS with per-week namespaces, allow switching to Chroma via env.
- Root .env policy confirmed: single file, no sub-app .env. No OpenAI keys present or referenced moving forward.

### 2.2) Status/Security Docs Review (2025-08-29)
- Statusreport: flagged ngrok and ElevenLabs gaps. Resolution: we will not add programmatic ngrok; instead, set `NEXT_PUBLIC_API_BASE` to the tunnel URL and add it to `CORS_ORIGINS`. ElevenLabs endpoints remain on the near-term roadmap.
- Security updates: ensured `/health` does not expose sensitive flags and added `/diagnostics` (admin-only). Implemented `get_current_user` helpers for JWT decoding.

### 2.3) Debugging Session (2025-08-29)
- Fixed backend startup issues:
  - Resolved dataclass error with CORS_ORIGINS (mutable default value issue) by using field(default_factory)
  - Fixed indentation errors in schemas.py
  - Fixed SQLAlchemy relationship error: Added missing `course` relationship in Week model
- Fixed frontend module resolution issues:
  - Added missing TypeScript path alias configuration for `@/` in tsconfig.json
  - Removed diff markers (`-` prefixes) from CoursePicker.tsx that were causing syntax errors
  - Created missing screenshots directory
- API connectivity verified:
  - CORS headers properly configured and working
  - Backend health endpoint responding correctly
  - All frontend pages loading without errors
- Current status: ✅ Both servers running, all pages loading without errors, API connectivity working

---

### 2.4) Dependency/File Consolidation (2025-08-29)
- Consolidated Python dependencies to a single root `requirements.txt`; removed backend-local requirements. All Python installs use `pip install -r requirements.txt` from repo root.
- Confirmed single root `.env` policy remains enforced. Backend loads only the root `.env`.

### 2.5) Comprehensive Testing Session (2025-08-29)
- Created test users in database:
  - student@test.com (password: student123)
  - professor@test.com (password: professor123)
  - admin@test.com (password: admin123)
- Fixed model relationship issues:
  - Removed duplicate AudioBlob and Conversation class definitions
  - Added missing relationships between Summary/User and Week/Course models
- Fixed frontend API client:
  - Added missing auth methods (login, register, logout) to api.ts
  - Implemented token management
- Testing results:
  - ✅ All pages load without JavaScript errors
  - ✅ Backend server starts successfully
  - ✅ Test users created in database
  - ❌ Login functionality blocked - JWT_SECRET missing from .env
  - ❌ Student/Professor dashboards lack populated UI elements
  - ⚠️ CORS working for health endpoint but intermittent for auth endpoints
- Key issues identified:
  - JWT_SECRET environment variable not configured
  - Dashboard components exist but don't display expected UI elements

---

## 3) Build Progress Tracker (Granular)

Legend: [ ] pending, [~] in progress, [x] done

### A) Backend Foundations
- [x] Choose SQLite for relational store
- [x] Choose FAISS/Chroma for vector index
- [x] Define tables: users, courses, weeks, readings, chunks, summaries, conversations, audio_blobs
- [x] Decide on job status table for ingestion tracking
- [x] Implement base FastAPI app and health endpoint
- [x] Implement auth (login, JWT)
- [x] Implement CORS for `http://localhost:3001`
  - Update: CORS supports multiple origins via `CORS_ORIGINS` env; include ngrok when tunneling.

### B) Ingestion Pipeline (LangChain)
- [x] Decide on `pypdf` for extraction
- [x] Decide on SentenceTransformers model (`all-MiniLM-L6-v2`) for embeddings
- [x] Chunking strategy (e.g., 1k chars, 200 overlap)
- [x] Index layout per week (namespace)
- [x] Endpoint: `POST /readings/upload?week_id=...` (multipart) — creates reading + queued job
- [x] Job orchestration: queued → running → done|error (FastAPI BackgroundTasks)
- [x] Endpoint: `GET /readings/jobs/{id}` for progress
### C) Summaries and Tutoring (Claude)
- [x] Prompt templates for weekly summary bullets
- [x] Endpoint: `GET /summaries?week_id=...`
- [x] Cache summaries by week; invalidate on new upload (planned follow-up: invalidate on successful ingestion)
  - Update: Implemented invalidation immediately after successful ingestion.

### D) Voice Session
- [x] Decide on ElevenLabs realtime and token mint flow
- [x] Endpoint: `GET /voice/token?voice_id=...`
- [x] Endpoint: `POST /sessions/start`
- [x] Endpoint: `POST /sessions/{id}/end` with transcript/audio (transcript only for now)
- [x] Server‑side timeout enforcement (300 seconds) via background task

### E) Frontend Core
- [x] Minimal Next.js scaffold (port 3001)
- [x] VoiceOrb component with live mic RMS pulse
- [x] `/voice-demo` page showcasing the VoiceOrb
- [x] `/voice/[course]/[week]` scaffolded with Start/End, TimerBar, token mint call
- [x] API client utilities (`lib/api.ts`)
- [ ] ElevenLabs WebRTC audio hookup (`lib/webrtc.ts` stub only)
- [ ] Tailwind CSS with OU branding (crimson, cream, surface colors)
- [ ] shadcn/ui components installation (Button, Card)
- [ ] `/login` page and API wiring
- [ ] `/role` page
- [ ] `/student` with Course/Week/Voice pickers
- [ ] `/professor` with DragDropUpload and job status panel
- [ ] Auth management utilities (`lib/auth.ts`)

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
  - Implemented via BackgroundTasks immediately after upload; status updated in `jobs` table.
  - Security hardening: `/health` returns non-sensitive status only; added `/diagnostics` (admin-only) for detailed checks.

---

## 5) Manual Validation Plan (No Test Suite)

- Backend
  - Verify `GET /health` reports database connectivity and env key presence.
  - Register a user via `POST /auth/register` then login via `POST /auth/login` and confirm short‑lived JWT returned.
  - Upload a small PDF to `/readings/upload?week_id=1` and verify response with `job_id` and `reading_id`; confirm file saved under `backend/app/storage/uploads/week_1/`.
  - Poll `/readings/jobs/{job_id}` until `status` is `done`; inspect `backend/app/storage/indexes/week_1/` for FAISS index files and confirm `chunks` rows exist.
  - Upload a small PDF; ensure job transitions to `done` and chunks/summaries are created.
  - Call `GET /summaries?week_id` and verify stable output across runs.
  - Start a session and confirm server‑side timeout closes it at 5 minutes.

- Frontend
  - Complete login → role → student flow; start a session.
  - Validate professor upload shows status transitions.
  - Confirm transcript updates and the TimerBar ends the session.
  - Visual QA: run Puppeteer to capture `/voice-demo` and review `voice-demo.png`.

---

## 6) Known Gaps / Future Work

- OCR for scanned PDFs.
- Background worker for ingestion at scale.
- Admin role and UI for role management.
- Export transcripts and audio blobs; download link from professor dashboard.
 - Programmatic ngrok management intentionally deferred; use manual tunnel and env overrides.

---

## 7) Operational Notes

- Rebuild index endpoint: `/maintenance/reindex?week_id=...` (admin‑guarded) to regenerate vectors from stored chunks.
- Health: `/health` returns DB status, vector index reachability, Claude connectivity, and ElevenLabs ping.
- Logs: redact all secrets; tag logs with session ID for traceability.

---

## 8) Checkpoint Log — 2025-08-29

- Backend scaffolding delivered: health, auth, ingestion (upload + background processing + jobs), FAISS vectors, summaries.
- Docs aligned with Agents.md: local embeddings only, `ELEVEN_API_KEY` unified, removed OpenAI refs in ngrok.
- Next milestones (backend-first):
  1) Tutor RAG endpoint `POST /tutor/query` with guardrails. (Done)
  2) Invalidate summaries on successful ingestion per week. (Done)
  3) ElevenLabs token mint `GET /voice/token` and sessions endpoints. (Done; add 300s auto-timeout enforcement next)
  4) Maintenance endpoints: reindex/clear per-week. (Done)
  5) Role guards for sensitive routes.
  6) Health details for vector status and Claude reachability.

Additional Alignments:
- Added alias `GET /jobs/{id}` to match frontend docs (kept `/readings/jobs/{id}` too).
- `GET /summaries` now returns both `content` and best-effort `bullets` array.
 - Security updates: implemented `/diagnostics` (admin-only) and sanitized `/health`.

---

## 9) Next Focus (Backend-First then Frontend)

- WebRTC: implement real ElevenLabs SDP flow in `frontend/lib/webrtc.ts` and add remote audio element.
- Frontend: Tailwind + shadcn/ui setup; `/login`, `/role`, `/student`, `/professor` upload and job status UI.
- Backend: add role guards to ingestion and maintenance (professor/admin), and optional search endpoint for debug.
