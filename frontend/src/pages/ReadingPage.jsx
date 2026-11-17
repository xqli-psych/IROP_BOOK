import React, { useState, useEffect, useRef } from "react";
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
  const [pageIndex, setPageIndex] = useState(0); // 0-indexed for React, but DB is 1-indexed
  const [paused, setPaused] = useState(false);
  
  // Dynamic database content
  const [pageData, setPageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { sessionId } = useSession();
  const commentAudioRef = useRef(null);
  const lastPlayedPageRef = useRef(null);

  // The actual database page number is pageIndex + 1
  const currentPageNumber = pageIndex + 1;
  const isLastPage = currentPageNumber >= story.total_parts; // Using total_parts from DB

  // Stop active comment audio immediately and reset
  const stopCommentAudio = () => {
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

  // Play comment audio with child voice pitch & cadence
  const playCommentVoice = (audioBase64) => {
    if (!audioBase64) return;
    stopCommentAudio();
    try {
      const audio = new Audio("data:audio/wav;base64," + audioBase64);
      audio.preservesPitch = false;
      audio.mozPreservesPitch = false;
      audio.webkitPreservesPitch = false;
      audio.playbackRate = 1.18;
      audio.play().catch((err) => {
        console.warn("Autoplay was blocked by browser policy:", err);
      });
      commentAudioRef.current = audio;
    } catch (e) {
      console.warn("Error playing comment audio:", e);
    }
  };

  // Fetch page data whenever the pageIndex changes
  useEffect(() => {
    const fetchPage = async () => {
      stopCommentAudio();
      setIsLoading(true);
      try {
        const response = await apiClient.getStoryPage(story.id, currentPageNumber);
        if (response.success && response.data) {
          setPageData(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch story page:", err);
        alert("Failed to load the page. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };

    if (story && story.id) {
      fetchPage();
    }
  }, [story, currentPageNumber]);

  // When a new page finishes loading and user is on the spread, play Alice's statement ONCE
  useEffect(() => {
    if (
      !isLoading &&
      pageData?.commentAudioBase64 &&
      pageData.page_number === currentPageNumber &&
      lastPlayedPageRef.current !== pageData.page_number &&
      !showPrompt &&
      !paused
    ) {
      lastPlayedPageRef.current = pageData.page_number;
      playCommentVoice(pageData.commentAudioBase64);
    } else if (showPrompt || paused || isLoading) {
      stopCommentAudio();
    }
  }, [pageData, showPrompt, paused, isLoading, currentPageNumber]);

  const handleOpenPrompt = () => {
    stopCommentAudio();
    setShowPrompt(true);
  };

  const goToNextPageOrFinish = async () => {
    stopCommentAudio();
    // Clear old page data immediately so it can NEVER replay while loading the next page
    setPageData(null);
    setIsLoading(true);
    setShowPrompt(false);
    
    if (isLastPage) {
      onFinish();
    } else {
      const nextPageIndex = pageIndex + 1;
      setPageIndex(nextPageIndex);
      
      try {
        await apiClient.updateProgress(sessionId, nextPageIndex + 1);
      } catch (err) {
        console.error("Failed to save progress", err);
      }
    }
  };

  const handleSaveAndExit = async () => {
    stopCommentAudio();
    try {
      await apiClient.updateProgress(sessionId, currentPageNumber);
      onExit();
    } catch (err) {
      console.error("Failed to save session before exiting:", err);
      onExit();
    }
  };

  if (isLoading || !pageData) {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
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
        onContinue={handleOpenPrompt}
        showContinue={!showPrompt}
        onPause={() => {
          stopCommentAudio();
          setPaused(true);
        }}
      />

      <main className={`reading-layout${paused ? " reading-layout-paused" : ""}`}>
        <div className="reading-main">
          <StoryBook
            leftImage={pageData.left_image_url}
            rightImage={pageData.right_image_url}
            faded={showPrompt}
          />

          {!showPrompt && (
            <AvatarComment
              comment={pageData.avatar_comment}
              hasAudio={Boolean(pageData?.commentAudioBase64)}
              onReplay={() => playCommentVoice(pageData?.commentAudioBase64)}
            />
          )}

          {showPrompt && (
            <MSTPrompt
              prompt={pageData.mst_prompt}
              reaction={pageData.mst_response}
              avatarComment={pageData.avatar_comment}
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
          onToggle={() => setTranscriptOpen(!transcriptOpen)}
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
