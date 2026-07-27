# IROP Reading App

A frontend prototype for an LLM-based shared reading experience: an older adult
reads a story alongside a child-like avatar, pausing along the way for **Mental
State Talk (MST)** questions — what a character is thinking, feeling, believing,
or intending.

There's no backend yet. Everything runs on the mock data in
`src/data/mockStory.js`. See [backend_integration.md](backend_integration.md)
for what's stubbed out and needs real API wiring.

## Tech Stack

React + Vite + JavaScript + plain CSS — one stylesheet per page, no Tailwind, no
component library, no CSS-in-JS. No React Router either; page navigation is a
`useState` screen switch in `App.jsx`. Icons are from `lucide-react`.

## Getting started

```bash
npm install
npm run dev
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## App flow

```
Welcome → Session Setup → Choose a Story → Story Preview → Reading → Finished
```

The Reading screen is the most involved one — it handles the story pages, the
avatar's comment bubble, the MST question/answer/reaction cycle, the transcript
drawer, and the pause overlay all in one place.

## Project structure

```
src/
  components/
    AvatarComment.jsx    — avatar image + comment bubble shown during reading
    MSTPrompt.jsx        — MST question, answer input, reaction, back/skip/continue
    PausedOverlay.jsx    — "Paused" overlay with Save & Exit / Keep Reading
    StoryBook.jsx        — double-page story spread, dims while MST is open
    StoryNavBar.jsx       — bottom nav bar on the story selection screen
    TopBar.jsx            — pause/end, title, progress bar, continue button
    TranscriptDrawer.jsx  — collapsible right-side transcript panel
  pages/
    WelcomePage.jsx
    SessionSetupPage.jsx
    StorySelectionPage.jsx
    StoryPreviewPage.jsx
    ReadingPage.jsx        — orchestrates everything above, plus pausing/paging
    FinishedPage.jsx
  data/mockStory.js        — the one mock story: pages, transcript, MST prompts
  styles/                  — one CSS file per page, plus global.css for tokens
  App.jsx                  — screen state + routing
public/
  images/                  — story art + the avatar image
```

## Current status

All six screens are built and wired together end-to-end with the mock story.
The reading flow supports: pausing (with a blur/fog effect over the story, not
a full modal), paging through MST question → typed answer → avatar reaction →
continue, and a collapsible transcript drawer. Since the mock data only has one
story part, finishing that one part goes straight to the Finished screen.

## Known gaps

- **Only one story, one part.** `totalParts` says 5 but only part 1 exists.
  Paging past it currently just ends the story (see
  [backend_integration.md](backend_integration.md)).
- **Avatar is a single static image**, not video. `AvatarComment.jsx` has a
  TODO for swapping in a real `<video>` once clips exist — per the original
  project notes, `.mov` isn't reliable in browsers, so those should be
  converted to transparent `.webm` first.
- **Nothing persists.** Session codes, MST answers, and pause/save state are
  all local component state that vanishes on refresh — see
  [backend_integration.md](backend_integration.md) for the full list of what
  needs a real backend.

## Explicitly out of scope for this MVP

Don't build these unless asked — they were deliberately cut from the original
spec:

- Font size adjustment
- Speech recognition (the mic icon next to the MST answer field is decorative)

## Future features to implement

Roughly in priority order:

1. **Real multi-part stories.** Wire up `story.pages` to a backend so a story
   can actually have more than one part, and make `ReadingPage`'s paging logic
   fetch the next part instead of reading from a fixed local array.
2. **Persisted sessions.** Save session code, current page/part, and MST
   answers server-side so "Save & Exit Session" actually saves something, and
   a reader can resume a paused session later instead of starting over.
3. **Dynamic avatar reactions.** Right now the avatar's reaction to an MST
   answer is a single fixed line per part. Eventually this should react to
   what the reader actually typed (likely LLM-generated).
4. **Real story library.** `StorySelectionPage` currently shows one real story
   and two static placeholder cards — replace with a real "list stories" call
   and support more than three stories (pagination/scrolling in the grid).
5. **Search / Saved / History / Settings.** The bottom nav bar on the story
   selection screen has four buttons that don't do anything yet — each needs
   its own screen and backend support.
6. **Real avatar video clips** (`Idle`, `Talking`, `Thinking`, `Nod`,
   `Celebrate`) converted to transparent `.webm`, replacing the current static
   image.
7. **Real book art.** The story page images are placeholder illustrations and
   need to be swapped for the licensed/real book art (same filenames, so no
   code changes needed — just replace the files in `public/images/`).
