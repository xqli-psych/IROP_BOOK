# IROP Reading

A shared reading tool for studying **Mental State Talk (MST)** during adult-child
reading sessions: a reader (e.g. an older adult participant) reads a picture book
page by page alongside a child-like avatar. At points in the story, the app asks
an MST question — what a character is thinking, feeling, believing, or intending
— the reader answers by typing or speaking, and an AI pipeline analyzes the
answer, detects whether MST is present, and has the avatar reply in character
(with a synthesized child voice).

This is a monorepo containing both halves of the app, merged via `git subtree`
with full commit history preserved from both original repos:

```
irop-reading/
  backend/   Express API + Supabase (Postgres) + LangGraph/Groq AI pipeline
  frontend/  React + Vite single-page app
```

Each half has its own detailed README — start there once you know which side
you're working on:

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)

## How the pieces fit together

```
React app (Vite dev server, :5173)
   |  fetch() calls to http://localhost:3000/api
   v
Express API (backend/, :3000)
   |                              \
   | Supabase client               \ Groq SDK
   v                                v
Supabase (Postgres)          Whisper (transcription)
  stories                    LLM via LangGraph (MST detection,
  story_pages                  child response, summary)
  sessions                   TTS (child-voice audio reply)
  session_logs
```

The frontend never talks to Supabase or Groq directly — everything goes through
the Express API.

## Quick start (running the whole app locally)

You need two terminals, plus a Supabase project and a Groq API key (ask
whoever owns those, or see [backend/README.md](backend/README.md) for what to
provision).

Before starting the backend, make sure there is a [backend/.env] file with the required environment variables and api keys (if not, create a new file). 

```bash
# Terminal 1 — backend
cd backend
npm install
npm start
# → backend running at http://localhost:3000
# → API logs: http://localhost:3000/api/logs

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Open `http://localhost:5173` to use the application.

The frontend's API base URL is currently hardcoded to `http://localhost:3000/api` in
[frontend/src/utils/apiClient.js](frontend/src/utils/apiClient.js) — there's no frontend
`.env` configuration for it yet, so if you run the backend on a different port or host,
you'll need to change that constant directly.

## App flow

```
Welcome → Session Setup (login) → Choose a Story → Story Preview → Reading → Finished
```

The Reading screen is where most of the interesting behavior lives: story page
display, the avatar's comment, the MST question/answer/reaction cycle (with
audio recording), a collapsible transcript drawer, and pause/save.

## Tech stack

| | |
|---|---|
| Frontend | React 19, Vite, plain CSS (no Tailwind/component library), no router (manual screen-state switch in `App.jsx`), no global state library |
| Backend | Node.js, Express 5, Supabase JS client, Multer (audio upload), Zod (structured LLM output) |
| AI / data | LangGraph (state machine orchestrating LLM calls), Groq (Whisper transcription, chat LLM, TTS), Supabase Postgres |

## Current status

Both halves are wired together end-to-end: session login, story listing, page
fetching, progress tracking, and MST answer analysis all hit the real backend
and a real Supabase database — this is no longer a mock-data prototype. There
is currently one seeded story ("There's an Alligator Under My Bed").

## Known gaps / things to be aware of

- **No tests.** Neither half has a test suite yet.
- **No DB migrations.** The Supabase schema is managed by hand (SQL editor /
  table editor) — there's no migrations folder or schema-as-code.
- **No env-based API URL config on the frontend** (see Quick start above).
- **One MST exchange per page.** The reader gets exactly one question → one
  answer → one reaction per page; see the roadmap below.
- **Bottom nav bar on the story selection screen is non-functional** (Search /
  Saved / History / Settings buttons don't do anything yet).
- Only one story is currently seeded in `story_pages`.

## Roadmap / future implementation

Not in priority order — pick based on what the current phase of the project needs:

1. **Multi-turn MST conversation per page.** Currently a reader gets one
   question, one answer, one avatar reaction, then must move on. Allow more
   than one round of back-and-forth at a page before continuing — this likely
   means changes to `MSTPrompt.jsx`'s submit/continue flow on the frontend and
   to how `session_logs` rows are structured/queried on the backend (currently
   one row per submission, keyed by `session_id` + `page_id`).
2. **TTS for `avatar_comment`.** Right now only the AI-generated MST reaction
   gets synthesized to speech (via `ttsService.js`); the avatar's per-page
   comment (`avatar_comment`, shown before the MST prompt) is text-only.
3. **Experiment with a more natural/customized TTS voice.** The current setup
   uses Groq's `canopylabs/orpheus-v1-english` model with a fixed voice
   ("hannah") — worth exploring voice options, tuning, or alternative
   providers for a more natural or more clearly "child-like" result.
4. **Build out the bottom nav bar**: Search, Saved, History, and Settings on
   the story selection screen currently render but do nothing — each needs a
   real screen and backend support (e.g. a "history" endpoint over
   `session_logs`, a "saved stories" concept, user-configurable settings).
5. **Add more books.** Only one story is seeded. Adding another means: story
   page images in `frontend/public/images/`, a `stories` row, and
   `story_pages` rows (see `backend/README.md`'s data model section for the
   exact columns) — plus, if the book is a copyrighted published work like the
   current one, checking on usage/licensing before shipping it anywhere public.

See each sub-README for additional lower-level gaps and roadmap items specific
to that half.
