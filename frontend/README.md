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

## Getting started

```bash
npm install
npm run dev
```

This assumes the backend is running at `http://localhost:3000` — the API base
URL is hardcoded in [`src/utils/apiClient.js`](src/utils/apiClient.js) (there's
no `.env` for it yet). Start the backend first, or the app's very first screen
past Welcome will fail to load.

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## App flow

```
Welcome → Session Setup (login) → Choose a Story → Story Preview → Reading → Finished
```

- **Session Setup** posts a participation ID + session code to
  `POST /api/sessions/login` and stores the returned session ID in
  `sessionStorage` via `useSession`.
- **Choose a Story** fetches the real story list from `GET /api/stories`.
- **Reading** is the most involved screen — it fetches page content per page
  turn, renders the story spread, the avatar's comment, the MST
  question/answer/reaction cycle (typed or recorded audio), a collapsible
  transcript drawer, and a pause overlay.

## Project structure

```
src/
  components/
    AvatarComment.jsx     avatar image + comment bubble shown during reading
    MSTPrompt.jsx          MST question, typed/recorded answer, AI reaction, back/skip/continue
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
  data/
    mockStory.js             legacy mock data — no longer imported anywhere, kept only as a reference shape
  styles/                    one CSS file per page, plus global.css for tokens
  App.jsx                    screen state + routing
public/
  images/                    story page art + the avatar image
```

## How it talks to the backend

Every API call goes through [`src/utils/apiClient.js`](src/utils/apiClient.js)
— there's no scattered `fetch()` calls elsewhere. If you're tracing a network
call, start there; if you're adding one, add it there too.

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
in Supabase (not just local state). MST answers (typed or recorded) are sent
to the backend for real AI analysis, and the avatar's reaction and synthesized
voice reply come back from that call and play in the UI.

## Known gaps

- **Only one story is seeded** (`total_parts` on it reflects the real page
  count now, unlike the old mock data).
- **One MST exchange per page.** After one question → one answer → one
  reaction, the reader has to continue; there's no way to have a longer
  back-and-forth at a single page yet.
- **Avatar is a single static image**, not video. `AvatarComment.jsx` still has
  a TODO for swapping in a real `<video>` once clips exist (per the original
  project notes, `.mov` isn't reliable in browsers, so those should be
  converted to transparent `.webm` first).
- **API base URL is hardcoded** in `apiClient.js` rather than coming from an
  env var — fine for local dev, will need addressing before any real
  deployment.
- **Bottom nav bar is decorative.** `StoryNavBar.jsx`'s Search / Saved /
  History / Settings buttons render but don't do anything.
- **The "session saved" message on `FinishedPage`** always shows regardless of
  whether the underlying progress-save calls actually succeeded.
- `data/mockStory.js` is dead code — safe to delete once nobody's using it as
  a reference for the page-data shape anymore.

## Explicitly out of scope (deliberately cut from the original spec)

Don't build these unless asked:

- Font size adjustment
- Speech recognition beyond what's already there (the mic button records
  audio and sends it to the backend for transcription — there's no
  client-side speech-to-text)

## Roadmap / future implementation

See the [repo root README](../README.md#roadmap--future-implementation) for
the full list shared with the backend. The frontend-relevant pieces:

1. **Multi-turn MST conversation per page** — `MSTPrompt.jsx`'s submit flow
   currently goes straight from "submitted" to a "Continue" button; supporting
   more than one round means reworking that flow to allow another
   answer/reaction cycle before advancing.
2. **TTS playback for `avatar_comment`**, not just the MST reaction — likely a
   small addition to `AvatarComment.jsx` alongside whatever the backend adds.
3. **Real, functional bottom nav bar** — Search, Saved, History, Settings each
   need a real screen/route (remember: there's no router yet, so this also
   means extending `App.jsx`'s screen-state approach or finally introducing
   one).
4. **More books** — `StorySelectionPage.jsx` already renders whatever
   `GET /api/stories` returns, so this is mostly a backend/data task; the
   frontend piece is just making sure the story grid and cover-image fallback
   logic (currently hardcoded to the alligator cover in
   `StorySelectionPage.jsx`) handle more than one story gracefully.
5. **Real avatar video clips** (`Idle`, `Talking`, `Thinking`, `Nod`,
   `Celebrate`) converted to transparent `.webm`, replacing the current static
   image.
