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
  const [pageIndex, setPageIndex] = useState(0); // 0-indexed for React, but DB is 1-indexed
  const [paused, setPaused] = useState(false);
  
  // New state for dynamic database content
  const [pageData, setPageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { sessionId } = useSession();

  // The actual database page number is pageIndex + 1
  const currentPageNumber = pageIndex + 1;
  const isLastPage = currentPageNumber >= story.total_parts; // Using total_parts from DB

  // Fetch page data whenever the pageIndex changes
  useEffect(() => {
    const fetchPage = async () => {
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

  const goToNextPageOrFinish = async () => {
    setShowPrompt(false);
    
    if (isLastPage) {
      // If it's the last page, we finish the story
      onFinish();
    } else {
      const nextPageIndex = pageIndex + 1;
      setPageIndex(nextPageIndex);
      
      // Save progress to the backend session table silently in the background
      try {
        await apiClient.updateProgress(sessionId, nextPageIndex + 1);
      } catch (err) {
        console.error("Failed to save progress", err);
      }
    }
  };

  const handleSaveAndExit = async () => {
    try {
      // Save the current page to the database before routing away
      await apiClient.updateProgress(sessionId, currentPageNumber);
      onExit();
    } catch (err) {
      console.error("Failed to save session before exiting:", err);
      onExit(); // Exit anyway even if save fails
    }
  };

  // Show a loading screen while waiting for the database
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
        onContinue={() => setShowPrompt(true)}
        showContinue={!showPrompt}
        onPause={() => setPaused(true)}
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
            />
          )}

          {showPrompt && (
            <MSTPrompt
              prompt={pageData.mst_prompt}
              reaction={pageData.mst_response}
              onBack={() => setShowPrompt(false)}
              onSkip={goToNextPageOrFinish}
              onContinue={goToNextPageOrFinish}
              
              // We pass these down so MSTPrompt can submit audio/text to the backend
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