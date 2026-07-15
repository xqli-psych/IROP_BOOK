import { useState } from "react";

import TopBar from "../components/TopBar";
import StoryBook from "../components/StoryBook";
import TranscriptDrawer from "../components/TranscriptDrawer";
import AvatarComment from "../components/AvatarComment";
import MSTPrompt from "../components/MSTPrompt";

function ReadingPage({ story }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const page = story.pages[0];

  return (
    <div className="app">
      <TopBar
        title={story.title}
        part={page.part}
        totalParts={story.totalParts}
        onContinue={() => setShowPrompt(true)}
      />

      <main className="reading-layout">
        <StoryBook
          leftImage={page.leftImage}
          rightImage={page.rightImage}
          faded={showPrompt}
        />

        <TranscriptDrawer
          open={transcriptOpen}
          transcript={page.transcript}
          onToggle={() => setTranscriptOpen(!transcriptOpen)}
        />

        {!showPrompt && (
          <AvatarComment
            comment={page.avatarComment}
          />
        )}

        {showPrompt && (
          <MSTPrompt
            prompt={page.mstPrompt}
            onSkip={() => setShowPrompt(false)}
            onSubmit={() => setShowPrompt(false)}
          />
        )}
      </main>
    </div>
  );
}

export default ReadingPage;