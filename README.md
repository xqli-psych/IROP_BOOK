# IROP Reading

A research-informed shared reading web application for studying **Mental State Talk (MST)** during intergenerational adult-child reading sessions. 

An adult reader (e.g. an older adult participant) reads an illustrated picture book alongside a 5-year-old child avatar named **Alice**. At key moments in the story, the app pauses for a dialogic reading prompt exploring what a character is feeling, thinking, believing, or intending. The reader responds by typing or speaking through their microphone. An AI pipeline evaluates emotional accuracy and Mental State Talk, and Alice replies in character using a synthesized child voice (via Orpheus TTS). If the reader names an incorrect emotion or misses MST, Alice gently questions and redirects them, and asks a broader personal follow-up question connecting the story's theme to the reader's own life.

This monorepo contains both halves of the system:
```
IROP_BOOK/
├── backend/    # Express API + Supabase (PostgreSQL) + LangGraph/Groq AI pipeline
└── frontend/   # React + Vite single-page application
```

---

## Prerequisites

Before running the application, make sure you have:
1. **Node.js** (v18 or higher recommended). Check with `node -v`.
2. **Groq API Key**: Needed for Whisper transcription, Qwen LLM analysis, and Orpheus text-to-speech. Get one at [console.groq.com](https://console.groq.com/).
3. **Supabase Project**: Provides the PostgreSQL database storing stories, pages, reading sessions, and MST logs. Get credentials at [supabase.com](https://supabase.com/).

---

## Quick Start (How to Run)

Running the application requires two terminal windows: one for the backend API and one for the frontend client.

### Step 1: Configure Environment Variables

Create a `.env` file inside the `backend/` folder (or copy from `backend/.env.example`):

**File location:** `backend/.env`
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_service_role_key_here
PORT=3000
```

> [!IMPORTANT]
> Use the Supabase **service_role key** (or anon key with appropriate table permissions) so the backend can write session logs and fetch story pages.

---

### Step 2: Database Setup (Supabase)

If you are connecting to a new Supabase project or updating existing tables:

1. Open your project dashboard at [supabase.com](https://supabase.com) and go to the **SQL Editor**.
2. Run the SQL script found in [tables.txt](tables.txt) to seed the story *"There's an Alligator Under My Bed"* and all 14 parts (27 pages).
3. Ensure the `session_logs` table includes the dedicated tracking columns by running:
   ```sql
   ALTER TABLE public.session_logs
   ADD COLUMN IF NOT EXISTS question_text TEXT,
   ADD COLUMN IF NOT EXISTS emotion_match TEXT,
   ADD COLUMN IF NOT EXISTS follow_up_question TEXT;
   ```
   *(Note: If these columns are omitted, the backend automatically preserves all metadata within `mst_analysis` without throwing errors).*

---

### Step 3: Start the Backend Server

Open **Terminal 1**:

```powershell
# Windows PowerShell
cd backend
npm install
npm start
```

```bash
# macOS / Linux
cd backend
npm install
npm start
```

You should see:
```text
Server is running!
- View DB logs: http://localhost:3000/api/logs
```

---

### Step 4: Start the Frontend Application

Open **Terminal 2**:

```powershell
# Windows PowerShell
cd frontend
npm install
npm run dev
```

```bash
# macOS / Linux
cd frontend
npm install
npm run dev
```

You should see:
```text
VITE v8.x.x  ready in ... ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### Step 5: Open the App in Your Browser

1. Navigate to **[http://localhost:5173](http://localhost:5173)** in Google Chrome or Microsoft Edge.
2. Grant microphone permissions if prompted (required for audio recording).
3. **Session Setup**: Enter any **Session Code** (e.g. `TEST101`) and **Participant ID** (e.g. `P01`), then click **Start Reading**.
4. **Choose Story**: Click on *"There's an Alligator Under My Bed"* and click **Start Story**.
5. **Reading Flow**:
   - Read the double-page spread. Alice will comment on the illustration.
   - Click **Continue** (top right) to open the dialogic question.
   - Speak your answer by clicking the **Microphone** icon, or type into the text box and press **Enter** or the **Send** button.
   - Alice will speak her reaction! If a follow-up question is asked, you can share a personal experience or click **Continue** to move to the next page.

---

## App Flow & Dialogic Reading Pipeline

```
Welcome 
   └── Session Setup (Login with Session Code & Participant ID)
          └── Choose Story 
                 └── Story Preview 
                        └── Reading Spread (Pages 1 to 14)
                               ├── Avatar Comment
                               ├── Mental State Talk Question
                               ├── Speech / Text Answer Submission
                               ├── Child Reaction (Orpheus TTS)
                               └── Thematic Personal Follow-Up (if partial/incorrect)
                                      └── Finished Screen
```

### Dialogic Reading & MST Analysis
The LangGraph pipeline evaluates each response against developmental psychology coding criteria:
1. **Mental State Talk (MST)**: Detects feelings (*scared, nervous, proud*), thoughts (*think, believe, pretend, wonder*), and intentions (*want, need, try*).
2. **Emotional Match (4-Way)**:
   - `CORRECT`: Matches the character's primary emotional reality. Alice celebrates warmly.
   - `PARTIAL`: Mixed feelings (e.g., proud of a clever plan, but still cautious of the alligator). Alice validates and points out the other feeling.
   - `INCORRECT`: Contradicts the story (e.g., character is terrified, but reader says "he is happy"). Alice follows a 3-step sequence:
     1. *Acknowledge* ("Happy?")
     2. *Question* ("Are you sure?")
     3. *State with clue* ("Look at his face, he looks super worried!")
   - `NONE`: Missed feelings completely (physical description only). Alice reacts to the action and asks how the character feels.
3. **Personal Follow-Up Questions (Distancing Prompts)**:
   - When the response is `INCORRECT`, `PARTIAL`, or `NONE`, Alice asks a broader personal question connecting the page's theme to the reader's life (e.g., *"Did you ever have a scary shadow in your room when you were little?"*).
4. **Session Logging**:
   - Every exchange is recorded in Supabase `session_logs` (`question_text`, `transcript`, `mst_detected`, `emotion_match`, `follow_up_question`, `child_response`, `conversation_summary`).
   - View live logs anytime at `http://localhost:3000/api/logs`.

---

## Architecture & System Overview

```
React App (Vite dev server, :5173)
   │  fetch() multipart/JSON requests
   ▼
Express API (backend/, :3000)
   ├── Supabase Client (PostgreSQL)
   │     ├── stories
   │     ├── story_pages
   │     ├── sessions
   │     └── session_logs (MST research data)
   └── Groq SDK Pipeline (LangGraph StateGraph)
         ├── Whisper (STT: audio transcription)
         ├── Qwen 2.5 32B (MST detection & response generation)
         └── Orpheus v1 (TTS: child-voice audio reply)
```

---

## Troubleshooting & FAQ

#### 1. `Something went wrong while processing your response`
- **Check Backend Logs**: Look at the terminal running `npm start`.
- **Groq API Key**: Verify `GROQ_API_KEY` in `backend/.env` is valid and has remaining rate limits.
- **Supabase Credentials**: Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct.
- If Groq rate limits are exceeded (HTTP 429), the backend automatically retries with exponential backoff.

#### 2. `Port 3000 or 5173 is already in use`
- On Windows, find and kill the process:
  ```powershell
  # Check what process is on port 3000
  netstat -ano | findstr :3000
  # Kill by PID (replace <PID> with the number from the rightmost column)
  taskkill /PID <PID> /F
  ```
- Or specify an alternate port in `backend/.env` with `PORT=3001` (note: update `BASE_URL` in `frontend/src/utils/apiClient.js` if changing the backend port).

#### 3. Microphone is not recording
- Ensure your browser has granted microphone access to `http://localhost:5173`.
- In Chrome: Click the tune/lock icon in the URL address bar → **Site Settings** → set **Microphone** to **Allow**.
- You can always type your answer in the text box as an alternative to audio recording.

#### 4. Where are reading session logs stored?
- View raw JSON logs in the browser at **`http://localhost:3000/api/logs`**.
- Or view and export logs directly in your Supabase dashboard under Table Editor → **`session_logs`**.

---

## Tech Stack Details

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Lucide Icons, Plain CSS |
| **Backend** | Node.js (ESM), Express 5, Multer (audio file uploads), Supabase JS Client |
| **AI Orchestration** | LangGraph (`@langchain/langgraph`), `@langchain/core`, ChatGroq |
| **AI Models (Groq)** | `whisper-large-v3` (Speech-to-Text), `qwen/qwen3.8-27b` (MST detection & chat), `canopylabs/orpheus-v1-english` (TTS) |
| **Database** | Supabase (PostgreSQL) |

---

## Sub-Package Documentation

For in-depth architecture details specific to each half of the repository:
- **Backend Deep-Dive**: [backend/README.md](backend/README.md)
- **Frontend Deep-Dive**: [frontend/README.md](frontend/README.md)
