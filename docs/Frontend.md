# New Frontend Plan — StudyAI

## 0) Overview

A modern, minimalist web frontend built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, and Framer Motion. Students authenticate, choose a Professor and Week, and start a five‑minute voice session. Professors upload weekly PDFs that power a local RAG pipeline (SQLite + local vector store) orchestrated by LangChain in the backend. We avoid OpenAI entirely; Anthropic Claude handles reasoning and tutoring prompts, while local embeddings (SentenceTransformers) support retrieval. Voice is powered by ElevenLabs realtime WebRTC.

Key differences from prior assets:
- No Postgres/pgvector. Use SQLite for relational data and a local vector store (FAISS or Chroma) for embeddings.
- No OpenAI usage. Remove OpenAI keys and models. Use Anthropic Claude for LLM calls and local embedding models for vectors.
- LangChain is the prompting/orchestration layer for ingestion + retrieval.

---

## 1) Tech Stack and Rationale

- Next.js App Router: file‑system routing, server components, server actions where needed.
- TypeScript: strict typing and DX.
- Tailwind CSS + shadcn/ui: consistent, accessible UI with minimal custom CSS.
- Framer Motion: micro‑interactions and the pulsing voice orb.
- WebRTC + Web Audio API: low‑latency duplex audio and visualizer in browser.
- Auth: lightweight JWT flow via backend.
- Config: environment via root `.env` surfaced to the frontend using `NEXT_PUBLIC_*` where appropriate.

Why this fits our constraints:
- Browser‑first voice experience with clean, branded UI.
- Minimal dependency on cloud providers (Claude only for LLM; local embeddings for vectors).
- Simple local dev: run backend + frontend without Docker for speed.

---

## 2) Information Architecture

- Authentication
  - `/login`: email/password → backend → JWT stored in httpOnly cookie or memory + refresh endpoint.
  - `/role`: Student or Professor selection; Admin link (optional basic panel later).
- Student flow
  - `/student`: choose Professor and Week → voice session.
  - `/voice/[course]/[week]`: five‑minute session with live transcript and voice orb.
- Professor flow
  - `/professor`: pick Week → drag‑and‑drop PDFs → upload → progress states (extract → chunk → embed → index) powered by backend jobs.
- Admin (optional minimal)
  - `/admin`: assign roles to users.

---

## 3) Project Layout

```
frontend/
├─ app/
│  ├─ (auth)/
│  │  ├─ login/page.tsx
│  │  └─ role/page.tsx
│  ├─ (dash)/
│  │  ├─ student/page.tsx
│  │  ├─ professor/page.tsx
│  │  └─ admin/page.tsx
│  ├─ voice/[course]/[week]/page.tsx
│  ├─ layout.tsx
│  └─ globals.css
├─ components/
│  ├─ ui/...           # shadcn generated
│  ├─ CoursePicker.tsx
│  ├─ WeekPicker.tsx
│  ├─ VoicePicker.tsx
│  ├─ VoiceOrb.tsx
│  ├─ TranscriptPane.tsx
│  ├─ TimerBar.tsx
│  └─ DragDropUpload.tsx
├─ lib/
│  ├─ api.ts           # fetch helpers
│  ├─ auth.ts          # token helpers
│  ├─ webrtc.ts        # ElevenLabs connect
│  └─ audio.ts         # visualizer
├─ public/
│  └─ brand.svg
├─ tailwind.config.ts
├─ shadcn.json
└─ package.json
```

Notes:
- Keep components small, focused, and accessible (ARIA labels, keyboard navigation).
- Dark theme default with OU Crimson as accent.

---

## 4) Environment Configuration

Root `.env` (single source of truth) and per‑framework exposure:

- Backend reads from root `.env`.
- Frontend reads via Next.js runtime; only expose safe values as `NEXT_PUBLIC_*`.

Frontend needs:
```
# Root .env (only these are read by frontend as NEXT_PUBLIC_*)
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_ELEVEN_AGENT_DEFAULT=VOICE_ID
NEXT_PUBLIC_VOICE_IDS=VOICE_ID_1,VOICE_ID_2,VOICE_ID_3,VOICE_ID_4,VOICE_ID_5
```

Removed keys vs. old plan:
- OPENAI_API_KEY is removed entirely.
- Use `ANTHROPIC_API_KEY` (backend only).

---

## 5) Visual Design and Theme

- Palette
  - Primary: OU Crimson `#841617`
  - Cream `#FFF0D4`
  - Surface `#0A0A0A`, Panel `#121212`
- Motion
  - Subtle hover transitions, easing for card interactions.
  - Voice orb scales with input level; idle shimmer.
- Typography
  - System UI stack or school‑approved fonts.
- Accessibility
  - Minimum 4.5:1 contrast; focus rings via Tailwind.

Tailwind extension sketch:
```ts
// tailwind.config.ts
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ou: { crimson: "#841617", cream: "#FFF0D4", surface: "#0A0A0A", panel: "#121212" }
      },
      boxShadow: { soft: "0 10px 30px rgba(0,0,0,.25)" },
      borderRadius: { xl2: "1.25rem" }
    }
  },
  plugins: []
};
```

---

## 6) Core UI Flows

### 6.1 Login
Minimal form using shadcn components; on success route to `/role`.

### 6.2 Role selection
Two cards with descriptions and CTA buttons to `/student` or `/professor`.

### 6.3 Student dashboard
- Course picker → Week picker → Voice picker → Start button.
- Disable Start until all selections are valid.

### 6.4 Professor dashboard
- Week selector.
- DragDropUpload with progress states (uploading, processing, done, error).
- Displays ingestion job status from backend (LangChain pipeline: extract → chunk → embed → index).

### 6.5 Voice session
- Full‑bleed page with VoiceOrb, TimerBar, and End Session.
- Connects to backend to mint ElevenLabs token and establish WebRTC (see `lib/webrtc.ts` stub).
- Live transcript: to be added via events or pulls.
- Force stop at 5 minutes; polite close message; upload transcript/audio.

---

## 7) Data & API Contracts (Frontend‑Facing)

Auth
- `POST /auth/login` { email, password } → { token }

Catalog
- `GET /courses` → [{ id, code, name }]
- `GET /weeks?course_id=...` → [{ id, week_number, title }]

Ingestion
- `POST /readings/upload?week_id=...` multipart/pdf → { job_id }
- `GET /jobs/{job_id}` → { status: queued|running|done|error, detail? }

Summaries
- `GET /summaries?week_id=...` → { content: string, bullets: string[] }

Voice
- `GET /voice/token?voice_id=...` → { token, expires_at }
- `POST /sessions/start` { week_id } → { id, expires_at }
- `POST /sessions/{id}/end` → 204

Client helpers
- `lib/api.ts`: `getVoiceToken`, `startSession`, `endSession`
- `lib/webrtc.ts`: `connectElevenLabsRealtime({ token, onRemoteTrack })` — placeholder to be completed with ElevenLabs SDP flow.

Search (optional debug)
- `GET /search?week_id=...&q=...` → top‑k chunks

Notes:
- All endpoints backed by SQLite + local vector index; LangChain orchestrates retrieval and Claude calls.

---

## 8) WebRTC and Audio UX

- Use `navigator.mediaDevices.getUserMedia` with echo cancellation and noise suppression.
- Visualizer: AnalyserNode → compute RMS/peak → drive VoiceOrb.
- Handle device errors (no mic, permissions) gracefully with inline help.
- Reconnect strategy: if token/connection drops, show toast and a retry button.

---

## 9) State Management

- Prefer React hooks & local component state; avoid heavy global stores.
- Use URL params for course/week; session state retained in memory.
- Keep API clients in `lib/api.ts` with narrow, typed functions.

---

## 11) Advanced Voice UI (Orb)

- Component: `components/VoiceOrb.tsx` renders a throbbing, glowing orb that scales with live mic input using Web Audio `AnalyserNode` RMS.
- Demo page: `/voice-demo` renders the orb standalone to validate visuals and mic handling.
- Styling: dark surface background with OU Crimson glow (`#841617`). Scale range ~1.0→1.35 proportional to amplitude.
- Next step: bind orb intensity to ElevenLabs speaking events (energy from PCM or `isSpeaking`), so it throbs when AI speaks.

## 12) Puppeteer Visual Check

- Dev dependency: `puppeteer` (see `frontend/package.json`).
- Script: `frontend/scripts/screenshot.js` navigates to `http://localhost:3001/voice-demo` and captures `voice-demo.png`.
- Usage:
  - Install: `cd frontend && npm install`
  - Run dev: `npm run dev` (port 3001)
  - New terminal: `npm run screenshot`
  - Open `frontend/voice-demo.png` to review rendering.

## 13) Using ngrok for Frontend → Backend

- Start backend on `:8000`, then start an ngrok HTTPS tunnel to `:8000`.
- Set `NEXT_PUBLIC_API_BASE` to the ngrok URL for the frontend runtime.
- Add the ngrok URL to backend `CORS_ORIGINS` (comma-separated list) if not already present.
- Restart backend to apply CORS changes.

## 12) Puppeteer Visual Check

- Dev dependency: `puppeteer` (see `frontend/package.json`).
- Script: `frontend/scripts/screenshot.js` navigates to `http://localhost:3001/voice-demo` and captures `voice-demo.png`.
- Usage:
  - Install: `cd frontend && npm install`
  - Run dev: `npm run dev` (port 3001)
  - New terminal: `npm run screenshot`
  - Open `voice-demo.png` to review rendering.


## 10) Performance & Resilience

- Code‑split route groups automatically via App Router.
- Defer non‑critical work; optimistic UI for uploads.
- Guardrails: disable inputs during in‑flight requests; retry with backoff for flaky endpoints.

---

## 11) Implementation Steps (Practical)

1) Scaffold Next.js app with TS, Tailwind, shadcn. Add OU theme.
2) Implement auth pages and `lib/api.ts` for login.
3) Build Student and Professor dashboards with pickers and upload.
4) Implement Voice session screen with WebRTC bootstrap and VoiceOrb.
5) Wire ingestion job poller to show progress.
6) Add summaries panel consumption (Claude‑generated via backend).
7) Polish: keyboard navigation, a11y, mobile responsiveness, empty states.

---

## 12) Testing & Validation (Frontend‑Only Scope)

- Manual checks: auth flow, upload flow, session start/stop, transcript updates.
- Use basic Cypress or Playwright smoke checks later if needed (out of scope for this prototype per instructions).

---

## 13) Deployment Notes

- Local: `npm run dev -- -p 3001` at `http://localhost:3001`.
- Env wires to root `.env`; do not create per‑folder `.env` files.
- When deploying, set public base URL and hide secrets on the backend only.

---

## 14) Risk & Mitigation

- Anthropic rate limits: implement minimal caching of summaries per week.
- Local embeddings: ensure sentence‑transformer selection fits memory; default to `all-MiniLM-L6-v2` and allow override.
- Realtime audio glitches: add reconnect + UI feedback.

---

## 15) Minimal UI Spec (Components)

- CoursePicker: `props { value, onChange, courses }`
- WeekPicker: `props { value, onChange, min=1, max=16 }`
- VoicePicker: `props { value, onChange, voices }`
- DragDropUpload: `props { weekId, onProgress, onDone }`
- VoiceOrb: `props { level: number, status: 'idle'|'listening'|'speaking'|'error' }`
- TranscriptPane: `props { items: { role: 'user'|'assistant', text: string }[] }`
- TimerBar: `props { totalSec=300, onExpire }`

---

## 16) Future Enhancements

- Offline‑first caching of week summaries.
- Professor analytics (per‑week topic coverage and student engagement).
- Theme switcher (light/dark) if desired.
