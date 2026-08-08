# IROP Reading — Backend

Express API behind the IROP Reading app. Handles session/story data (via
Supabase) and the MST (Mental State Talk) analysis pipeline: transcribing a
reader's spoken or typed answer, detecting MST with an LLM, generating an
in-character child response, and synthesizing that response to speech.

See the [repo root README](../README.md) for how this fits with the frontend.

## Tech stack

- **Node.js** (ESM — `"type": "module"`) + **Express 5**
- **Supabase** (`@supabase/supabase-js`) — Postgres client, no ORM/migrations
- **LangGraph** (`@langchain/langgraph`) — orchestrates the MST analysis as a
  small state machine
- **Groq** (`groq-sdk`, `@langchain/groq`) — Whisper transcription, the chat
  LLM, and TTS
- **Multer** — multipart audio upload handling
- **Zod** — structured/validated LLM output

## Project structure

```
backend/
  index.js                    Express app entry point
  routes/api.js                All route definitions, mounted at /api
  controllers/
    storyController.js         GET /stories, GET /stories/:id/pages/:n
    sessionController.js       login, progress updates, story linking
    readingController.js       POST /analyze-reading, GET /logs (the core pipeline)
  services/
    dbService.js                Every Supabase query in the app
    transcript.js                Groq Whisper transcription
    ttsService.js                 Groq TTS (child-voice audio reply)
  graph/
    state.js                     GraphState shape
    nodes.js                     evaluateMst / generateResponse / updateSummary
    workflow.js                   Wires the nodes into a StateGraph
  config/
    env.js                       Loads env vars
    llm.js                        ChatGroq client config
    supabase.js                   Supabase client singleton
  middlewares/upload.js          Multer config (saves to uploads/)
  public/                        Static assets Express serves directly (legacy;
                                  the real frontend is in ../frontend)
```

## Setup & running

Prerequisites:
- Node.js v18+
- A Supabase project (Postgres + a service-role key for write access)
- A Groq API key

```bash
npm install
GROQ_API_KEY=your_key SUPABASE_URL=https://your-project.supabase.co SUPABASE_KEY=your_service_role_key npm start
```

Or create a `.env` file (gitignored) instead of inline vars:

```
GROQ_API_KEY=sk-xxxx
SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_KEY=service_role_xxx
```

The server listens on `process.env.PORT || 3000`.

## API reference

All routes are mounted at `/api` (see [routes/api.js](routes/api.js)).

| Method | Path | Controller | Purpose |
|---|---|---|---|
| GET | `/stories` | `storyController.listStories` | List all stories |
| GET | `/stories/:storyId/pages/:pageNumber` | `storyController.fetchPage` | Fetch one page's content |
| POST | `/sessions/login` | `sessionController.loginSession` | Create a new session from a session code + participation ID |
| PUT | `/sessions/:sessionId/progress` | `sessionController.updateProgress` | Update the session's current page number |
| PUT | `/sessions/:sessionId/story` | `sessionController.linkStoryToSession` | Attach a chosen story to a session |
| POST | `/analyze-reading` | `readingController.analyzeReading` | Transcribe + analyze an MST answer, get back a child response (see below) |
| GET | `/logs` | `readingController.getLogs` | Raw dump of all `session_logs`, newest first |

### `POST /analyze-reading` in detail

Multipart form request. Required fields: `sessionId`, `pageId`, and either an
`audioFile` (recorded answer) or `transcriptText` (typed answer); optionally
`storyPageText` for context.

```bash
curl -X POST http://localhost:3000/api/analyze-reading \
  -F "sessionId=<uuid>" \
  -F "pageId=<uuid>" \
  -F "audioFile=@./answer.webm" \
  -F "storyPageText=The alligator hid under the bed..."
```

Flow, in [readingController.analyzeReading](controllers/readingController.js):
1. Transcribe the uploaded audio via Groq Whisper (`services/transcript.js`),
   or use `transcriptText` directly.
2. Load the session's latest conversation summary (`getLatestSummary` in
   `dbService.js`).
3. Run the LangGraph pipeline (`graph/workflow.js`) — three sequential LLM
   calls: `evaluate_mst` (did the reader engage in MST? via Zod-structured
   output) → `generate_response` (in-character child reply) → `update_summary`
   (rolling conversation summary for next time).
4. Persist a `session_logs` row.
5. Synthesize the child's reply to speech via Groq TTS.
6. Delete the uploaded temp file.

Response:

```json
{
  "success": true,
  "transcript": "...",
  "mstDetected": false,
  "childResponse": "Why did they do that?",
  "audioBase64": "UklGR..."
}
```

This is the slowest endpoint in the app by a wide margin — it makes at least
four sequential external calls to Groq (transcription, three chat calls inside
the graph, TTS), none of them parallelized.

## Data model

No ORM, no migrations — every query lives in [services/dbService.js](services/dbService.js)
and the schema is managed directly in Supabase. Tables in use:

**`stories`** — `id` (uuid), `title`, `author`, `genre`, `estimated_time`, `total_parts`

**`story_pages`**
```sql
create table public.story_pages (
  id uuid not null default gen_random_uuid (),
  story_id uuid not null,
  page_number integer not null,
  left_image_url text null,
  right_image_url text null,
  page_text text not null,
  avatar_comment text null,
  mst_prompt text null,
  mst_response text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint story_pages_pkey primary key (id),
  constraint story_pages_story_id_page_number_key unique (story_id, page_number),
  constraint story_pages_story_id_fkey foreign key (story_id) references stories (id) on delete cascade
);
```
`mst_response` is used as a fallback line shown to the reader only if the live
AI-generated response fails.

**`sessions`** — `id` (uuid), `session_code`, `participation_id`,
`current_page_number`, `story_id`, `updated_at`. `session_code` is
**intentionally not unique** — `createOrGetSession` always inserts a fresh row
per login rather than upserting, so repeat logins with the same code don't
overwrite a prior session's progress/history (this was a real bug, fixed by
switching insert-vs-upsert — see git history).

**`session_logs`** — `session_id`, `page_id`, `participation_id` (denormalized
from the session for easy CSV export), `story_page_text`, `transcript`,
`mst_detected`, `mst_analysis`, `child_response`, `conversation_summary`,
`created_at`.

## Where to look first when debugging

- Transcripts empty/failing → `services/transcript.js` and `GROQ_API_KEY`
- DB writes failing → `services/dbService.js` and Supabase project/policies
  (row-level security can silently reject writes if misconfigured)
- LLM output looks wrong → `config/llm.js` and the prompts in `graph/nodes.js`
- A session's progress got overwritten → check `sessionController.loginSession`
  / `dbService.createOrGetSession` — this is the exact class of bug that was
  fixed once already

## Known gaps

- No tests (a good first target: mock the `llm` client and unit-test
  `graph/nodes.js`, or add an integration test for `analyzeReading` with a
  small prerecorded audio fixture).
- No schema migrations — the SQL above is the closest thing to a schema
  definition in the repo; keep it up to date if you change the table.
- Uploaded audio cleanup uses `fs.promises.unlink` after the whole pipeline
  runs — if the pipeline throws partway through, the `catch` block handles
  cleanup, but there's no retry/dead-letter handling if that also fails.
- No request tracing/structured logging beyond `console.log`/`console.error`.

## Roadmap / future implementation

See the [repo root README](../README.md#roadmap--future-implementation) for
the full list. The backend-relevant pieces:

1. **Multi-turn MST conversation per page** — `analyze-reading` and
   `session_logs` currently model one question/answer/reaction per page;
   supporting a back-and-forth conversation means deciding how multiple
   exchanges on the same page relate to each other (same `session_logs` row
   appended to, or multiple rows tied together).
2. **TTS for `avatar_comment`** — extend `ttsService.js` usage to the page's
   `avatar_comment` text, not just the MST reaction.
3. **More natural/custom TTS voice** — currently a fixed Groq TTS model/voice
   (`canopylabs/orpheus-v1-english`, voice "hannah").
4. **Backend support for the nav bar features** (search, saved, history,
   settings) — history has a natural home querying `session_logs`; the others
   need new tables/endpoints.
5. **More books** — add rows to `stories` and `story_pages` (see the schema
   above) plus page art in the frontend's `public/images/`.
