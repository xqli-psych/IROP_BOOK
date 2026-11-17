# IROP Reading — Backend

Express API behind the IROP Reading app. Handles session/story data (via
Supabase) and the MST (Mental State Talk) analysis pipeline: transcribing a
reader's spoken or typed answer, detecting MST with an LLM, generating an
in-character child response, and synthesizing that response to speech.

See the [repo root README](../README.md) for how this fits with the frontend.

## Tech stack

- **Node.js** (ESM — `"type": "module"`) + **Express 5**
- **Supabase** (`@supabase/supabase-js`) — Postgres client
- **LangGraph** (`@langchain/langgraph`) — orchestrates the MST analysis as a state machine
- **Groq** (`groq-sdk`, `@langchain/groq`) — Whisper transcription, chat LLM (Qwen), and TTS (Orpheus)
- **Multer** — multipart audio upload handling

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
    ttsService.js                 Groq TTS (Orpheus child-voice audio reply)
  graph/
    state.js                     GraphState shape (includes followUpQuestion, isFollowUp)
    nodes.js                     evaluateMst / generateResponse / updateSummary
    workflow.js                   Wires the nodes into a StateGraph
  config/
    env.js                       Loads env vars from backend/.env
    llm.js                        ChatGroq client config (qwen/qwen3.8-27b, maxTokens: 350)
    supabase.js                   Supabase client singleton
  middlewares/upload.js          Multer config (saves to uploads/)
```

## Setup & running

Prerequisites:
- Node.js v18+
- A Supabase project (PostgreSQL + service-role key)
- A Groq API key

### 1. Configure `.env`
Create a `.env` file in `backend/.env`:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_service_role_key_here
PORT=3000
```

### 2. Start the Server
```bash
npm install
npm start
```
The server listens on `http://localhost:3000` (or `process.env.PORT`).
API logs are visible at `http://localhost:3000/api/logs`.

## API reference

All routes are mounted at `/api` (see [routes/api.js](routes/api.js)).

| Method | Path | Controller | Purpose |
|---|---|---|---|
| GET | `/stories` | `storyController.listStories` | List all stories |
| GET | `/stories/:storyId/pages/:pageNumber` | `storyController.fetchPage` | Fetch one page's content |
| POST | `/sessions/login` | `sessionController.loginSession` | Create a new session from a session code + participation ID |
| PUT | `/sessions/:sessionId/progress` | `sessionController.updateProgress` | Update the session's current page number |
| PUT | `/sessions/:sessionId/story` | `sessionController.linkStoryToSession` | Attach a chosen story to a session |
| POST | `/analyze-reading` | `readingController.analyzeReading` | Transcribe + analyze an MST answer, get back child response & follow-up |
| GET | `/logs` | `readingController.getLogs` | Raw dump of all `session_logs`, newest first |

### `POST /analyze-reading` in detail

Multipart form request (`multipart/form-data`).

**Request Fields:**
- `sessionId`: (string, required) Active session UUID.
- `pageId`: (string, required) Story page UUID.
- `audioFile`: (file, optional) Recorded audio in WebM/WAV format.
- `transcriptText`: (string, optional) Typed text (if audio not provided).
- `storyPageText`: (string, optional) Text of the current story page.
- `questionText`: (string, optional) The prompt question asked.
- `expectedEmotion`: (string, optional) Expected character emotional state.
- `visualSceneContext`: (string, optional) Visual clues / avatar comment.
- `isFollowUp`: (string "true"/"false", optional) Set to "true" when user is answering Alice's personal follow-up question.

**Pipeline Flow:**
1. Transcribe uploaded audio via Groq Whisper (`services/transcript.js`), or use `transcriptText`.
2. Retrieve rolling conversation summary from `session_logs`.
3. Run the LangGraph StateGraph (`graph/workflow.js`):
   - `evaluateMst`: Analyzes reader's transcript for Mental State Talk and classifies emotional match (`CORRECT`, `PARTIAL`, `INCORRECT`, `NONE`).
   - `generateResponse`:
     - If `CORRECT`: Generates warm, childlike celebration (< 20 words, vocal tag).
     - If `INCORRECT`: Generates 3-step redirect (< 20 words: Acknowledge → Question → Statement with clues) AND a broader personal follow-up question.
     - If `PARTIAL`: Validates noticed feeling and highlights missing feeling AND a personal follow-up question.
     - If `NONE`: Reacts to physical action, asks feeling question AND a personal follow-up question.
     - If `isFollowUp`: Acknowledges reader's personal experience with warmth (< 15 words).
   - `updateSummary`: Updates rolling 3-sentence summary of discussed feelings, visual clues, and personal stories.
4. Synthesize Alice's spoken reply via Groq TTS (`services/ttsService.js`).
5. Persist log row in `session_logs` with question, emotion match, MST status, and follow-up data.
6. Delete temporary uploaded audio file.

**Response JSON:**
```json
{
  "success": true,
  "transcript": "he is happy",
  "mstDetected": true,
  "isEmotionCorrect": false,
  "emotionMatch": "INCORRECT",
  "detectedEmotion": "happy",
  "missingNuance": "",
  "childResponse": "Happy? Are you sure? Look at his face, he looks super worried! Did you ever have a scary shadow in your room when you were little?",
  "followUpQuestion": "Did you ever have a scary shadow in your room when you were little?",
  "audioBase64": "UklGR..."
}
```

## Data model

The schema is hosted in Supabase:

- **`stories`** — `id` (uuid), `title`, `author`, `genre`, `estimated_time`, `total_parts`.
- **`story_pages`** — `id` (uuid), `story_id`, `page_number`, `left_image_url`, `right_image_url`, `page_text`, `avatar_comment`, `mst_prompt`, `mst_response`.
- **`sessions`** — `id` (uuid), `session_code`, `participation_id`, `current_page_number`, `story_id`, `created_at`, `updated_at`.
- **`session_logs`** — `id` (uuid), `session_id`, `page_id`, `participation_id`, `story_page_text`, `transcript`, `question_text`, `emotion_match`, `mst_detected`, `mst_analysis`, `follow_up_question`, `child_response`, `conversation_summary`, `created_at`.

### Supabase Migration for Tracking Columns
Run this in the Supabase SQL Editor:
```sql
ALTER TABLE public.session_logs
ADD COLUMN IF NOT EXISTS question_text TEXT,
ADD COLUMN IF NOT EXISTS emotion_match TEXT,
ADD COLUMN IF NOT EXISTS follow_up_question TEXT;
```

## Where to look first when debugging

- **Transcripts empty/failing**: Check `services/transcript.js` and `GROQ_API_KEY`.
- **DB writes failing**: Check `services/dbService.js` and Supabase credentials in `.env`.
- **Groq rate limits (429)**: `readingController.js` includes 3 automatic retries with exponential backoff.
- **Orpheus TTS issues**: Check `services/ttsService.js`.
