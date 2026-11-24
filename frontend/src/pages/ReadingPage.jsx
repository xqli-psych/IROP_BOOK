
import React, {
  useState,
  useEffect,
  useRef
} from "react";

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

  // Reading interaction stages
  const [stage, setStage] = useState("reading");
  const [pageIndex, setPageIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Database-driven story sequence
  const [pages, setPages] = useState([]);
  const [pageData, setPageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const { sessionId } = useSession();

  const commentAudioRef = useRef(null);
  const autoAdvanceTimerRef = useRef(null);

  // Determine current page from the validated sequence
  const currentPageNumber = pages[pageIndex]?.page_number;

  const isLastPage =
    pages.length > 0 &&
    pageIndex === pages.length - 1;

  // Stop active comment audio
  const stopCommentAudio = () => {

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    if (commentAudioRef.current) {
      try {
        commentAudioRef.current.pause();
        commentAudioRef.current.currentTime = 0;
        commentAudioRef.current = null;

      } catch (err) {
        console.warn("Could not pause audio:", err);
      }
    }
  };

  // Play Alice's comment audio
  const playCommentVoice = (
    audioBase64,
    onEndedCallback
  ) => {

    if (!audioBase64) {
      if (onEndedCallback) onEndedCallback();
      return;
    }

    stopCommentAudio();

    try {
      const audio = new Audio(
        "data:audio/wav;base64," + audioBase64
      );

      audio.preservesPitch = false;
      audio.mozPreservesPitch = false;
      audio.webkitPreservesPitch = false;
      audio.playbackRate = 1.18;

      if (onEndedCallback) {
        audio.onended = onEndedCallback;
      }

      audio.play().catch((err) => {
        console.warn(
          "Autoplay was blocked by browser policy:",
          err
        );
      });

      commentAudioRef.current = audio;

    } catch (err) {
      console.warn("Error playing comment audio:", err);

      if (onEndedCallback) onEndedCallback();
    }
  };

  // Load and validate the entire story sequence
  useEffect(() => {

    let cancelled = false;

    setPages([]);
    setPageIndex(0);
    setPageData(null);
    setStage("reading");
    setLoadError("");
    setIsLoading(true);

    async function loadSequence() {
      try {

        const response =
          await apiClient.getStorySequence(story.id);

        if (
          !response.success ||
          !Array.isArray(response.data) ||
          !response.data.length
        ) {
          throw new Error("Story has no pages.");
        }

        // Verify the expected number of story parts
        if (
          response.data.length !== Number(story.total_parts)
        ) {
          throw new Error(
            `Expected ${story.total_parts} parts, ` +
            `found ${response.data.length}.`
          );
        }

        if (!cancelled) {
          setPages(response.data);
        }

      } catch (err) {

        if (!cancelled) {
          setLoadError(err.message);
          setIsLoading(false);
        }
      }
    }

    loadSequence();

    return () => {
      cancelled = true;
    };

  }, [story.id, story.total_parts, retryCount]);

  // Fetch enriched content for the current page
  // This preserves the latest main's audio and prompt logic
  useEffect(() => {

    if (currentPageNumber == null) return;

    let cancelled = false;

    stopCommentAudio();
    setIsLoading(true);
    setPageData(null);

    async function fetchPage() {

      try {

        const response = await apiClient.getStoryPage(
          story.id,
          currentPageNumber
        );

        // Verify the page still matches the validated sequence
        if (
          !response.success ||
          !response.data ||
          response.data.id !== pages[pageIndex]?.id
        ) {
          throw new Error(
            "Story page changed or could not be loaded. Please retry."
          );
        }

        if (!cancelled) {
          setPageData(response.data);
        }

      } catch (err) {

        if (!cancelled) {
          setLoadError(err.message);
        }

      } finally {

        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchPage();

    return () => {
      cancelled = true;
      stopCommentAudio();
    };

  }, [story.id, pages, pageIndex, currentPageNumber]);

  // Stage 1 -> Stage 2
  // Adult finishes reading and Alice comments
  const handleFinishedReading = () => {

    stopCommentAudio();
    setStage("comment");

    if (pageData?.commentAudioBase64) {

      playCommentVoice(
        pageData.commentAudioBase64,
        () => {

          autoAdvanceTimerRef.current = setTimeout(() => {

            setStage((prev) =>
              prev === "comment" ? "prompt" : prev
            );

          }, 800);
        }
      );
    }
  };

  // Stage 2 -> Stage 3
  const handleProceedToPrompt = () => {
    stopCommentAudio();
    setStage("prompt");
  };

  // Move to the next validated story page
  const goToNextPageOrFinish = async () => {

    stopCommentAudio();

    setPageData(null);
    setIsLoading(true);
    setStage("reading");

    if (isLastPage) {

      onFinish();

    } else {

      const nextPageIndex = pageIndex + 1;

      setPageIndex(nextPageIndex);

      try {

        if (sessionId) {

          await apiClient.updateProgress(
            sessionId,
            pages[nextPageIndex].page_number
          );
        }

      } catch (err) {
        console.error("Failed to save progress", err);
      }
    }
  };

  // Save current progress before exiting
  const handleSaveAndExit = async () => {

    stopCommentAudio();

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

  // Display loading errors
  if (loadError) {

    return (
      <div
        className="app"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 16
        }}
      >
        <h2>Unable to load story</h2>

        <p role="alert">{loadError}</p>

        <button
          onClick={() =>
            setRetryCount(count => count + 1)
          }
        >
          Retry from beginning
        </button>

        <button onClick={onExit}>
          Exit
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
        totalParts={pages.length}
        onContinue={
          stage === "reading"
            ? handleFinishedReading
            : handleProceedToPrompt
        }
        showContinue={false}
        onPause={() => {
          stopCommentAudio();
          setPaused(true);
        }}
      />

      <main
        className={
          `reading-layout${paused
            ? " reading-layout-paused"
            : ""}`
        }
      >

        <div className="reading-main">

          <StoryBook
            leftImage={pageData.left_image_url}
            rightImage={pageData.right_image_url}
            faded={stage === "prompt"}
          />

          {/* Stage 1: Reading */}
          {stage === "reading" && (

            <div className="reading-finish-bar">

              <button
                type="button"
                className="finished-reading-btn"
                onClick={handleFinishedReading}
              >
                <span>Finished Reading</span>
              </button>

            </div>
          )}

          {/* Stage 2: Avatar comment */}
          {stage === "comment" && (

            <AvatarComment
              comment={pageData.avatar_comment}
              hasAudio={
                Boolean(pageData?.commentAudioBase64)
              }
              onReplay={() =>
                playCommentVoice(
                  pageData?.commentAudioBase64
                )
              }
              onProceed={handleProceedToPrompt}
            />

          )}

          {/* Stage 3: MST prompt */}
          {stage === "prompt" && (

            <MSTPrompt
              key={pageData.id}
              prompt={
                pageData.openPrompt ||
                pageData.mst_prompt
              }
              followUpQuestionProp={
                pageData.followUpPrompt ||
                pageData.follow_up_prompt
              }
              reaction={pageData.mst_response}
              avatarComment={pageData.avatar_comment}
              onReplayComment={() =>
                playCommentVoice(
                  pageData?.commentAudioBase64
                )
              }
              hasCommentAudio={
                Boolean(pageData?.commentAudioBase64)
              }
              onBack={() => {
                stopCommentAudio();
                setStage("reading");
              }}
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
