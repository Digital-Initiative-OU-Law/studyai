# StudyAI — Agents Guide (Updated)

This document replaces the prior AGENTS.md for the new StudyAI project. It codifies constraints, environment policy, guardrails, and task guidance for AI agents collaborating on this codebase.

---

## 1) Project Truths and Constraints

- Single environment file: only the root `.env` is authoritative. Do not create `.env` (or `.env.local`) in subfolders.
- Datastore: local only (no Postgres). Use SQLite for structured data and a local vector store (FAISS or Chroma) for embeddings.
- No OpenAI usage. Remove `OPENAI_API_KEY` from `.env` and code paths. Do not add OpenAI dependencies.
- LLM: Anthropic Claude exclusively for LLM calls (summaries, tutoring, prompts). Use `ANTHROPIC_API_KEY` from root `.env`.
- Orchestration: LangChain manages PDF ingestion, chunking, embeddings via local models, retrieval, and prompt composition.
- Voice: ElevenLabs realtime (WebRTC) for low‑latency duplex audio. Backend mints tokens; frontend connects via browser.
- Test suite: intentionally skipped for this prototype. Focus on a working vertical slice.

---

## 2) Repository Etiquette

- Root markdown policy: do not place `.md` files in repo root except `README.md`, `LICENSE`, `AGENTS.md` (if present). All new docs live under `studyai/docs/` for this project.
- Temporary notes: if agents need scratch space, prefer `docs/agent-notes/` rather than root.
- Minimal diffs: keep changes tightly scoped; follow the existing code style (PEP 8 for Python; Prettier/TS conventions for frontend).

---

## 3) Environment Policy

- Only root `.env` is loaded by all services.
- Required keys for StudyAI:
  - `ANTHROPIC_API_KEY=...` (backend only)
  - `ELEVEN_API_KEY=...` (backend only)
  - `JWT_SECRET=...` (backend only)
  - `SESSION_MAX_SECONDS=300` (default, backend only)
  - `NEXT_PUBLIC_API_BASE=http://localhost:8000` (frontend)
  - `NEXT_PUBLIC_VOICE_IDS=...` (frontend)
- Explicitly disallowed: `OPENAI_API_KEY`, OpenAI model/env references.

Notes:
- If a third‑party service requires additional keys, add them to root `.env` and thread them via backend config only (not exposed to frontend unless safe and necessary).

---

## 4) Architectural Guardrails

- Backend
  - FastAPI application exposes endpoints for auth, ingestion, summaries, sessions, and realtime events if needed.
  - SQLite for tables (users, courses, weeks, readings, chunks, summaries, conversations, audio_blobs). Keep migrations simple (Alembic optional; start with pragmatic DDL).
  - Vector index via FAISS or Chroma managed by LangChain, scoped per‑week.
  - Embeddings generated locally using SentenceTransformers (e.g., `all-MiniLM-L6-v2`) via LangChain embeddings interface. Do not call remote embedding APIs.
  - Summaries and tutoring prompts: Anthropic Claude models (e.g., `claude-3-5-sonnet-latest`), called from backend only.
  - Ingestion pipeline: PDF extract → chunk → embed → index, with progress reported via job status endpoints.
  - Voice: mint ElevenLabs WebRTC tokens; enforce 5‑minute session cap server‑side.

- Frontend
  - Next.js App Router + shadcn/ui for UI; WebRTC for voice; Web Audio for visualization.
  - Only safe environment variables are prefixed with `NEXT_PUBLIC_`.
  - No direct LLM calls; all LLM interactions go through backend APIs.

---

## 5) Security and Privacy

- Secrets stay server‑side. Never expose `ANTHROPIC_API_KEY` or `ELEVEN_API_KEY` to the browser.
- JWT with short expiration; use httpOnly cookies or in‑memory tokens to reduce XSS risk.
- Upload validation: PDFs only for ingestion; size and type checks.
- Rate limits: enforce session caps (e.g., 3 sessions/week/student if implemented) and hard 5‑minute duration per session.
- Content policy: classroom‑appropriate guardrails; add simple heuristics server‑side before LLM calls when feasible.

---

## 6) Coding Guidelines

- Python: PEP 8, type hints preferred, 4‑space indent, modules in `snake_case`, classes in `PascalCase`.
- TypeScript/React: 2‑space indent; components in `PascalCase`, utilities in `lib/` lower‑case; keep effects clean and abort on unmount for async calls.
- Logging: concise, structured where possible; avoid printing secrets.
- Errors: return typed error payloads; show clear UI to users.

---

## 7) Tasks for Agents (High‑Level)

1) Backend setup with SQLite and LangChain pipeline (no Postgres).
2) Claude integration for summaries and tutoring prompts.
3) ElevenLabs token mint endpoint and session orchestration.
4) Frontend scaffolding with voice session UX.
5) PDF upload flow and ingestion job status UI.
6) Summaries fetch and display for selected week.

Out of scope: dedicated automated test suite and Dockerized Postgres stack.

---

## 8) Failure Modes & Responses

- Claude errors: exponential backoff and a friendly UI message; cache last good summary.
- Embedding model missing: fallback to a smaller local model; document requirements.
- Vector index corruption: reindex per‑week from stored chunks; provide maintenance endpoint.
- WebRTC token issues: show retry prompt; allow manual refresh; surface status badges.

---

## 9) PR & Commit Hygiene (For Agents)

- Commits: imperative present, ≤ 72 chars subject, brief body.
- PRs: explain rationale, affected areas, and manual validation steps; link to `studyai/docs/` references.
- Avoid unrelated changes and refactors; keep diffs surgical.

---

## 10) Local Development Checklist

- `ANTHROPIC_API_KEY` present and valid.
- ElevenLabs account and `ELEVEN_API_KEY` configured.
- Python env includes LangChain and SentenceTransformers; Node env for frontend.
- Run backend first, then frontend (`-p 3001`) to match local expectations.

