import { Save } from "lucide-react";

function FinishedPage({ story, onReturnToStories }) {
  return (
    <div className="app finished-page">
      <header className="finished-header">
        <h1>You’ve Finished the Story!</h1>
        <p>{story.title}</p>
      </header>

      <div className="finished-body">
        <p className="finished-save-note">
          <Save size={18} className="finished-save-icon" aria-hidden="true" />
          Your reading session has been saved.
        </p>

        <div className="finished-content">
          <div className="finished-avatar">Avatar Placeholder</div>

          <div className="finished-message">
            <p>
              Thank you for reading and sharing your thoughts with me. I really
              enjoyed hearing what you think!
              <br />
              Would you like to read more stories with me?
            </p>

            <button onClick={onReturnToStories}>
              Return to Choosing Stories
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinishedPage;
