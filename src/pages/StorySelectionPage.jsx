import React, { useState, useEffect } from "react";
import { Play } from "lucide-react";
import StoryNavBar from "../components/StoryNavBar";
import { apiClient } from "../utils/apiClient";
import { useSession } from "../hooks/useSession";

function StorySelectionPage({ onViewStory }) {
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { sessionId } = useSession();

  // Fetch stories on mount
  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await apiClient.getStories();
        if (response.success) {
          setStories(response.data);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load library.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLibrary();
  }, []);

  const handleStoryClick = async (story) => {
      try {
        // Use story.id for the database call
        await apiClient.linkStory(sessionId, story.id);
        
        // Pass the ENTIRE story object up to App.jsx
        onViewStory(story);
      } catch (err) {
        console.error("Failed to select story:", err);
        alert("Could not start this story. Please try again.");
      }
    };

  return (
    <div className="app story-selection-page">
      <header className="story-selection-header">
        <h1>Choose a Story</h1>
        <p>What would you like to read today?</p>
      </header>

      <div className="story-selection-body">
        {isLoading && <p>Loading library...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {!isLoading && !error && (
          <div className="story-grid">
            {stories.map((s) => (
              <div className="story-card" key={s.id}>
                <div className="cover-wrapper">
                  {/* Fallback to standard cover logic, or pull from DB if you add cover_url to stories table */}
                  <img
                    src="/images/alligator-cover-page.jpg"
                    alt={s.title}
                  />

                  <button
                    className="cover-view-btn"
                    onClick={() => handleStoryClick(s)}
                  >
                    <Play size={16} aria-hidden="true" />
                    View Story
                  </button>
                </div>

                <h2>{s.title}</h2>
                <p>{s.genre}</p>
                <p>{s.estimated_time}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <StoryNavBar />
    </div>
  );
}

export default StorySelectionPage;