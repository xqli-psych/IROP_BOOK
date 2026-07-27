import { Play } from "lucide-react";

import StoryNavBar from "../components/StoryNavBar";

import "../styles/StorySelectionPage.css";

function StorySelectionPage({ story, onViewStory }) {
  return (
    <div className="app story-selection-page">
      <h1>Choose a Story</h1>

      <p>What would you like to read today?</p>

      <div className="story-grid">
        <div className="story-card placeholder-card">
          <div className="cover-wrapper">
            <div className="book-placeholder">
              Book Cover Placeholder
            </div>

            <button className="cover-view-btn">
              <Play size={16} aria-hidden="true" />
              View Story
            </button>
          </div>

          <h2>Story Title</h2>
          <p>Genre</p>
          <p>Estimated Time</p>
        </div>

        <div className="story-card">
          <div className="cover-wrapper">
            <img
              src="/images/alligator-cover-page.jpg"
              alt={story.title}
            />

            <button
              className="cover-view-btn"
              onClick={onViewStory}
            >
              <Play size={16} aria-hidden="true" />
              View Story
            </button>
          </div>

          <h2>{story.title}</h2>
          <p>{story.genre}</p>
          <p>{story.time}</p>
        </div>

        <div className="story-card placeholder-card">
          <div className="cover-wrapper">
            <div className="book-placeholder">
              Book Cover Placeholder
            </div>

            <button className="cover-view-btn">
              <Play size={16} aria-hidden="true" />
              View Story
            </button>
          </div>

          <h2>Story Title</h2>
          <p>Genre</p>
          <p>Estimated Time</p>
        </div>
      </div>

      <StoryNavBar />
    </div>
  );
}

export default StorySelectionPage;