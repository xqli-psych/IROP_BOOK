import { useState } from "react";

import TopBar from "../components/TopBar";
import StoryBook from "../components/StoryBook";
import TranscriptDrawer from "../components/TranscriptDrawer";
import AvatarComment from "../components/AvatarComment";
import MSTPrompt from "../components/MSTPrompt";
import PausedOverlay from "../components/PausedOverlay";

function ReadingPage({ story, onFinish, onExit }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const page = story.pages[pageIndex];
  const isLastPage = pageIndex >= story.pages.length - 1;

  // TODO: once a real backend supplies more parts, replace this paging
  // through story.pages with fetching the next part.
  const goToNextPageOrFinish = () => {
    setShowPrompt(false);
    if (isLastPage) {
      onFinish();
    } else {
      setPageIndex((index) => index + 1);
    }
  };

  return (
    <div className="app">
      <TopBar
        title={story.title}
        part={page.part}
        totalParts={story.totalParts}
        onContinue={() => setShowPrompt(true)}
        showContinue={!showPrompt}
        onPause={() => setPaused(true)}
      />

      <main className={`reading-layout${paused ? " reading-layout-paused" : ""}`}>
        <div className="reading-main">
          <StoryBook
            leftImage={page.leftImage}
            rightImage={page.rightImage}
            faded={showPrompt}
          />

          {!showPrompt && (
            <AvatarComment
              comment={page.avatarComment}
            />
          )}

          {showPrompt && (
            <MSTPrompt
              prompt={page.mstPrompt}
              reaction={page.mstResponse}
              onBack={() => setShowPrompt(false)}
              onSkip={goToNextPageOrFinish}
              onContinue={goToNextPageOrFinish}
            />
          )}
        </div>

        <TranscriptDrawer
          isOpen={transcriptOpen}
          transcript={page.transcript}
          onToggle={() => setTranscriptOpen(!transcriptOpen)}
        />
      </main>

      {paused && (
        <PausedOverlay
          onKeepReading={() => setPaused(false)}
          // "Save & Exit" is really just "Exit" right now — it doesn't save anything.
          // Before this can go to the backend, we need an endpoint that records
          // pageIndex (and probably the transcript scroll position) so the story
          // can pick back up where the reader left off next time.
          onSaveExit={onExit}
        />
      )}
    </div>
  );
}

export default ReadingPage;