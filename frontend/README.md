# IROP Reading — Frontend

React single-page app for a shared reading experience: a reader goes through a
story page by page alongside a child-like avatar, pausing along the way for
**Mental State Talk (MST)** questions — what a character is thinking, feeling,
believing, or intending — answered by typing or recording audio.

This app is fully wired to the real backend in [`../backend`](../backend) —
session login, story listing, page content, progress tracking, and MST answer
analysis all hit real API endpoints backed by Supabase and a Groq-powered AI
pipeline. See the [repo root README](../README.md) for how the two halves fit
together and how to run both at once.

## Tech Stack

React + Vite + JavaScript + plain CSS — one stylesheet per page, no Tailwind, no
component library, no CSS-in-JS. No React Router either; page navigation is a
`useState` screen switch in `App.jsx`. No global state library — state is local
component state plus two custom hooks (`useSession`, `useAudioRecorder`). Icons
are from `lucide-react`.

## Getting started (How to Run)

1. Make sure the backend server is running first on `http://localhost:3000` (see [`../backend/README.md`](../backend/README.md)).
2. Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

3. Open **`http://localhost:5173`** in your web browser.

Other scripts:
- `npm run build`: Production build with Vite.
- `npm run preview`: Preview the production build locally.
- `npm run lint`: Run ESLint.

## App flow

```
Welcome → Session Setup (login) → Choose a Story → Story Preview → Reading → Finished
```

- **Session Setup**: Posts a participation ID + session code to
  `POST /api/sessions/login` and stores the returned session ID in
  `sessionStorage` via `useSession`.
- **Choose a Story**: Fetches the real story list from `GET /api/stories`.
- **Reading**: Renders the story spread, avatar comment, transcript drawer, and the MST dialogic prompt.
- **Dialogic Reading & Follow-Up (MSTPrompt.jsx)**:
  - If the reader gives a correct emotion, Alice celebrates warmly and the reader clicks **Continue**.
  - If the reader's emotion is incorrect, partial, or misses MST, Alice redirects them and asks a broader personal follow-up question. The reader can type/speak a response to Alice (which is evaluated and logged as well) or click **Continue** to move to the next page.

## Project structure

```
src/
  components/
    AvatarComment.jsx     avatar image + comment bubble shown during reading
    MSTPrompt.jsx          dialogic reading prompt, voice/text input, AI response, follow-up flow
    PausedOverlay.jsx      "Paused" overlay with Save & Exit / Keep Reading
    StoryBook.jsx           double-page story spread, dims while MST is open
    StoryNavBar.jsx          bottom nav bar on story selection (mostly non-functional placeholders — see Known gaps)
    TopBar.jsx               pause/end, title, progress bar
    TranscriptDrawer.jsx     collapsible right-side transcript panel
  pages/
    WelcomePage.jsx
    SessionSetupPage.jsx     login screen, calls apiClient.loginSession
    StorySelectionPage.jsx   real story grid, calls apiClient.getStories / linkStory
    StoryPreviewPage.jsx
    ReadingPage.jsx          orchestrates everything above, plus fetching pages and saving progress
    FinishedPage.jsx
  hooks/
    useSession.js            wraps sessionStorage for the active session ID
    useAudioRecorder.js       wraps MediaRecorder/getUserMedia for MST audio answers
  utils/
    apiClient.js             every backend call the app makes, in one place
  styles/                    one CSS file per page, plus global.css for tokens
  App.jsx                    screen state + routing
public/
  images/                    story page art + the avatar image
```

## How it talks to the backend

Every API call goes through [`src/utils/apiClient.js`](src/utils/apiClient.js)
— there are no scattered `fetch()` calls elsewhere.

| Function | Endpoint |
|---|---|
| `getStories()` | `GET /api/stories` |
| `getStoryPage(storyId, pageNumber)` | `GET /api/stories/:storyId/pages/:pageNumber` |
| `loginSession(sessionCode, participationId)` | `POST /api/sessions/login` |
| `linkStory(sessionId, storyId)` | `PUT /api/sessions/:sessionId/story` |
| `updateProgress(sessionId, pageNumber)` | `PUT /api/sessions/:sessionId/progress` |
| `analyzeReading(formData)` | `POST /api/analyze-reading` |

## Current status

All six screens are built and wired end-to-end against the real backend.
Session login, story selection, and reading progress are genuinely persisted
in Supabase. Dialogic reading with Mental State Talk analysis, 4-way emotional accuracy match, 3-step childlike redirection, and personal thematic follow-up questions are fully interactive with Orpheus TTS audio playback.
