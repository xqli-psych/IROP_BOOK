import React, { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import StoryBook from "../components/StoryBook";
import TranscriptDrawer from "../components/TranscriptDrawer";
import AvatarComment from "../components/AvatarComment";
import MSTPrompt from "../components/MSTPrompt";
import PausedOverlay from "../components/PausedOverlay";
import { apiClient } from "../utils/apiClient";
import { useSession } from "../hooks/useSession";

function ReadingPage({ story, onFinish, onExit }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Store the complete ordered story sequence
  const [pages, setPages] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const { sessionId } = useSession();

  // Current story part from the ordered sequence
  const pageData = pages[pageIndex] ?? null;

  const currentPageNumber =
    pageData?.page_number ?? pageIndex + 1;

  const isLastPage =
    pages.length > 0 &&
    pageIndex === pages.length - 1;

  // Load the entire story sequence once
  useEffect(() => {
    let cancelled = false;

    setPages([]);
    setPageIndex(0);
    setShowPrompt(false);
    setLoadError("");
    setIsLoading(true);

    async function loadSequence() {
      try {
        const response = await apiClient.getStorySequence(
          story.id
        );

        if (
          !response.success ||
          !Array.isArray(response.data) ||
          !response.data.length
        ) {
          throw new Error("Story has no pages.");
        }

        // Verify the number of parts
        if (
          response.data.length !== Number(story.total_parts)
        ) {
          throw new Error(
            `Expected ${story.total_parts} parts, ` +
            `found ${response.data.length}. ` +
            "Check Supabase story content."
          );
        }

        if (!cancelled) {
          setPages(response.data);
        }
      } catch (err) {
        console.error(
          "Failed to load story sequence:",
          err
        );

        if (!cancelled) {
          setLoadError(
            err.message || "Could not load story."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (story?.id) {
      loadSequence();
    }

    return () => {
      cancelled = true;
    };
  }, [story.id, story.total_parts, retryCount]);

  // Move to the next story part
  const goToNextPageOrFinish = async () => {
    setShowPrompt(false);

    if (isLastPage) {
      onFinish();
    } else {
      const nextPageIndex = pageIndex + 1;

      setPageIndex(nextPageIndex);

      // Save progress using the actual page number
      try {
        if (sessionId) {
          await apiClient.updateProgress(
            sessionId,
            pages[nextPageIndex].page_number
          );
        }
      } catch (err) {
        console.error(
          "Failed to save progress",
          err
        );
      }
    }
  };

  // Save progress when exiting
  const handleSaveAndExit = async () => {
    try {
      if (sessionId) {
        await apiClient.updateProgress(
          sessionId,
          currentPageNumber
        );
      }

      onExit();
    } catch (err) {
      console.error(
        "Failed to save session before exiting:",
        err
      );

      onExit();
    }
  };

  // Display errors with a retry option
  if (loadError) {
    return (
      <div
        className="app"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh"
        }}
      >
        <h2>Unable to load story</h2>

        <p role="alert">{loadError}</p>

        <button
          onClick={() =>
            setRetryCount((count) => count + 1)
          }
        >
          Retry
        </button>
      </div>
    );
  }

  // Loading screen
  if (isLoading || !pageData) {
    return (
      <div
        className="app"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh"
        }}
      >
        <h2>Loading page...</h2>
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar
        title={story.title}
        part={currentPageNumber}
        totalParts={story.total_parts}
        onContinue={() => setShowPrompt(true)}
        showContinue={!showPrompt}
        onPause={() => setPaused(true)}
      />

      <main
        className={`reading-layout${
          paused ? " reading-layout-paused" : ""
        }`}
      >
        <div className="reading-main">
          <StoryBook
            leftImage={pageData.left_image_url}
            rightImage={pageData.right_image_url}
            faded={showPrompt}
          />

          {!showPrompt && (
            <AvatarComment
              comment={pageData.avatar_comment}
            />
          )}

          {showPrompt && (
            <MSTPrompt
              key={pageData.id}
              prompt={pageData.mst_prompt}
              reaction={pageData.mst_response}
              onBack={() => setShowPrompt(false)}
              onSkip={goToNextPageOrFinish}
              onContinue={goToNextPageOrFinish}
              pageId={pageData.id}
              storyPageText={pageData.page_text}
            />
          )}
        </div>

        <TranscriptDrawer
          isOpen={transcriptOpen}
          transcript={pageData.page_text}
          onToggle={() =>
            setTranscriptOpen(!transcriptOpen)
          }
        />
      </main>

      {paused && (
        <PausedOverlay
          onKeepReading={() => setPaused(false)}
          onSaveExit={handleSaveAndExit}
        />
      )}
    </div>
  );
}

export default ReadingPage;
