# UROP_BOOK — Backend Overview

This document explains the backend code for the UROP_BOOK application so teammates can understand how requests flow, where core logic lives, and how to run and extend the system.

**Quick Summary**
- Purpose: Accept recorded audio of an elderly reader, transcribe it, detect "mental state talk" (MST), generate a short child-like response, update a conversation summary, persist a session log, and synthesize a child-voiced audio reply.
- Primary endpoint: `POST /api/analyze-reading` (audio upload + optional `storyPageText`).

**Table of Contents**
- Project setup
- Request flow / architecture
- Key files and responsibilities
- Data model & persistence
- Environment variables
- Example request (curl)
- Development notes & extension ideas

**Project setup**

Prerequisites
- Node.js (v18+ recommended)
- A Groq API key for transcription/tts and the Groq/LLM usage
- A Supabase project + service role key for `session_logs` persistence

Install

```bash
npm install
```

Run (development)

```bash
GROQ_API_KEY=your_key SUPABASE_URL=https://... SUPABASE_KEY=your_key npm start
```

The server listens on port 3000 by default. The web UI (frontend) is served from the `public/` folder by [index.js](index.js).

**Request flow / architecture**

1. Client uploads an audio recording and (optionally) the page text to `POST /api/analyze-reading` implemented in [routes/api.js](routes/api.js).
2. `multer` (see [middlewares/upload.js](middlewares/upload.js)) saves the file to `uploads/`.
3. The request is handled by `analyzeReading` in [controllers/readingController.js](controllers/readingController.js):
	 - It fetches the latest conversation summary using `getLatestSummary()` from [services/dbService.js](services/dbService.js).
	 - Calls `transcribeAudio()` in [services/transcript.js](services/transcript.js) which uses Groq's Whisper model to transcribe the audio file.
	 - Builds an `initialState` object (story page text, previous summary, and transcript) and invokes the LangGraph state machine `graph.invoke(initialState)` from [graph/workflow.js](graph/workflow.js).
	 - Persists the `graphResult` using `saveSessionLog()` in [services/dbService.js](services/dbService.js).
	 - Generates child-voiced audio via `generateSpeech()` in [services/ttsService.js](services/ttsService.js) and returns a base64 WAV string to the client.
	 - Uploaded file is removed (`fs.unlinkSync`) after processing or upon error to avoid disk buildup.

The LangGraph pipeline (see [graph/workflow.js](graph/workflow.js)) runs three nodes in sequence:
- `evaluate_mst` — analyzes the transcript for MST (mental state talk) using a structured LLM output (see [graph/nodes.js](graph/nodes.js)).
- `generate_response` — uses LLM to generate a brief, child-like reply that either encourages MST or prompts it.
- `update_summary` — updates the running conversation summary for future context.

**Key files and responsibilities**
- [index.js](index.js): Express server bootstrap, static file serving, API router mounting.
- [config/env.js](config/env.js): Loads environment variables used across the app (`GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`).
- [config/llm.js](config/llm.js): Constructs the LLM client used by the graph nodes (`ChatGroq` with `openai/gpt-oss-20b`).
- [config/supabase.js](config/supabase.js): Exports the configured Supabase client.
- [routes/api.js](routes/api.js): Defines `POST /analyze-reading` and `GET /logs`.
- [middlewares/upload.js](middlewares/upload.js): Multer storage configuration for file uploads (saves to `uploads/`).
- [controllers/readingController.js](controllers/readingController.js): Core request handler `analyzeReading()` and `getLogs()`.
- [services/transcript.js](services/transcript.js): Calls Groq audio transcription (`whisper-large-v3-turbo`) and returns text.
- [services/ttsService.js](services/ttsService.js): Calls Groq audio TTS (`canopylabs/orpheus-v1-english`) and returns base64 WAV audio.
- [services/dbService.js](services/dbService.js): `getLatestSummary()` and `saveSessionLog()` — persistence for `session_logs`.
- [graph/workflow.js](graph/workflow.js): Assembles the LangGraph `StateGraph` with the `GraphState` shape.
- [graph/state.js](graph/state.js): Defines the `GraphState` annotation (shape of the graph's state).
- [graph/nodes.js](graph/nodes.js): Node implementations: `evaluateMst`, `generateResponse`, `updateSummary`.

Notes on a few important functions
- `analyzeReading(req, res)` in `readingController.js` — full end-to-end orchestration. Handles validation, transcription, graph invocation, logging, TTS, cleanup, and JSON response shaped as:

	- `success`: boolean
	- `transcript`: string (transcribed text)
	- `mstDetected`: boolean
	- `childResponse`: string (generated reply)
	- `audioBase64`: string (base64-encoded WAV)

- `evaluateMst(state)` — uses a Zod schema to request a structured response from the LLM (`hasMst` and `reasoning`) so the app can programmatically determine whether MST is present.

**Data model & persistence**
The app writes to a Supabase table `session_logs` via `saveSessionLog()` in [services/dbService.js](services/dbService.js). The inserted columns are:
- `story_page_text`
- `transcript`
- `mst_detected`
- `mst_analysis`
- `child_response`
- `conversation_summary`

Ensure your Supabase table includes a `created_at` timestamp (used when `getLogs()` orders entries).

**Environment variables**
You must provide these environment variables to run the backend:
- `GROQ_API_KEY` — Groq SDK API key (used by transcription, tts, and LLM client)
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_KEY` — Supabase service role key (write access)

Example `.env` snippet:

```
GROQ_API_KEY=sk-xxxx
SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_KEY=service_role_xxx
```

**Example request**
Use the following `curl` to test `analyze-reading` (replace `audio.webm` and endpoint as needed):

```bash
curl -X POST http://localhost:3000/api/analyze-reading \
	-F "audioFile=@./audio.webm" \
	-F "storyPageText=The thief crept into the baker's shop..."
```

Sample success response:

```json
{
	"success": true,
	"transcript": "...transcribed text...",
	"mstDetected": false,
	"childResponse": "Why did they do that?",
	"audioBase64": "UklGR..."
}
```

**Development notes & extension ideas**
- Security: Do not commit `SUPABASE_KEY` or `GROQ_API_KEY` to source control. Use environment vars / secrets manager.
- Error handling: The controller uses `unlinkSync` to remove uploads; converting to async `fs.promises.unlink()` would avoid blocking.
- Scalability: Offload transcription and TTS to background jobs for better throughput and faster API responses.
- Observability: Add request tracing, metrics, and structured logs.
- Tests: Add unit tests for `graph/nodes.js` logic by mocking the `llm` client. Add an integration test for `analyzeReading` using a small prerecorded audio fixture.

**Where to look first when debugging**
- If transcripts are empty or failing: check `services/transcript.js` and `GROQ_API_KEY`.
- If DB writes fail: inspect `services/dbService.js` and the Supabase project/policies.
- If LLM outputs are unexpected: inspect [config/llm.js](config/llm.js) and the prompts in [graph/nodes.js](graph/nodes.js).

If you'd like, I can also:
- Add inline JSDoc comments to critical functions
- Produce unit tests for the graph nodes
- Add a small Postman collection or OpenAPI spec for the endpoints

---
Updated backend README.
