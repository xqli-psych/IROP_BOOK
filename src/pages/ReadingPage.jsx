import { useState } from "react";

import TopBar from "../components/TopBar";
import StoryBook from "../components/StoryBook";
import TranscriptDrawer from "../components/TranscriptDrawer";
import AvatarComment from "../components/AvatarComment";
import MSTPrompt from "../components/MSTPrompt";

function ReadingPage({ story, onFinish }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const page = story.pages[pageIndex];
  const isLastPage = pageIndex >= story.pages.length - 1;

  // Skipping (or continuing past the reaction) moves to the next mock page;
  // once there isn't one, it goes straight to the finished-story screen.
  // TODO: once a real backend supplies more parts, this is where paging
  // through story.pages should be replaced with fetching the next part.
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
      />

      <main className="reading-layout">
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
    </div>
  );
}

export default ReadingPage;