# Backend Integration Notes (superseded)

**This document is stale.** It was written while the app ran entirely on mock
data; the backend has since been built and wired up end-to-end (see
[README.md](README.md) and [../backend/README.md](../backend/README.md)). It's
kept here for historical context on what the original wiring plan looked like,
but don't trust the specifics below as current — check the actual code (mainly
`src/utils/apiClient.js` and the page components) instead. Current known gaps
and roadmap live in `README.md`.

---

This app is a frontend prototype. Every screen currently runs on the mock data in
`src/data/mockStory.js` and local component state — nothing is actually saved,
validated, or fetched from anywhere. This doc collects the spots in the code where
a real backend needs to slot in, so whoever picks this up doesn't have to go
hunting for them. Each section links back to a `// TODO:` comment already sitting
at that spot in the code.

## Story data (`src/data/mockStory.js`)

The whole file is standing in for an API response. Right now there's one story
with one "part" hardcoded, even though `totalParts` says 5. Whatever endpoint
serves story content needs to return this same shape (or the frontend needs to
adapt to whatever shape it actually returns) — title, author, genre, time, and a
`pages` array where each entry has `leftImage`/`rightImage`, `transcript`,
`avatarComment`, `mstPrompt`, and `mstResponse`.

## Session code (`src/pages/SessionSetupPage.jsx`)

The session code input isn't wired to anything — it's not even hooked up to
React state yet. Continue needs to actually send the typed code to the backend,
check it's valid and not expired, and show an inline error if it isn't, before
letting the reader move on to story selection.

## Story list (`src/pages/StorySelectionPage.jsx`)

Two of the three cards on this page are placeholders just to fill out the grid —
only the alligator story is real. Once there's a "list stories" endpoint, the
whole grid should be generated from that response instead of three hand-written
cards.

## Paging through a story (`src/pages/ReadingPage.jsx`)

`ReadingPage` pages through `story.pages` locally with a `pageIndex` state
variable. Since the mock story only has one page, "Skip" or "Continue" past the
last (only) page just goes straight to the finished screen. Once the backend can
actually serve part 2, 3, 4, 5..., this local paging should be replaced with a
real fetch for "next part," and `isLastPage` should reflect what the backend says
rather than `story.pages.length`.

## MST answers (`src/components/MSTPrompt.jsx`)

When a reader types an answer and hits Enter, `handleSubmit` just flips a local
`submitted` flag — the actual answer text never goes anywhere. Two things need
backend wiring here:

1. The typed answer needs to actually be sent and saved against the session.
2. The avatar's reaction (`reaction` prop, shown after submitting) is currently
   the same fixed line every time (`mstResponse` in the mock data). Depending on
   how "smart" this is supposed to be, that might need to come back from the
   same submit call, or from a separate LLM-backed endpoint that reacts to what
   the reader actually wrote.

## Pause / Save & Exit (`src/pages/ReadingPage.jsx`, `src/components/PausedOverlay.jsx`)

"Save & Exit Session" currently just exits — it doesn't save anything. To make
that real, there needs to be an endpoint that records enough state to resume
later: at minimum the current `pageIndex`, probably also whether the reader was
mid-MST-prompt when they left.

## "Session saved" note (`src/pages/FinishedPage.jsx`)

The finished screen always shows "Your reading session has been saved," even
though nothing was saved. Once there's a real save call (either at pause/exit or
at natural story completion), this should reflect whether that actually
succeeded — and probably show something different if it failed.
