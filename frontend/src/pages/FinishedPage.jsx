import { Save, Undo2 } from "lucide-react";

function FinishedPage({ story, onReturnToStories }) {
  return (
    <div className="app finished-page">
      <header className="finished-header">
        <h1>You’ve Finished the Story!</h1>
        <p>{story.title}</p>
      </header>

      <div className="finished-body">
        {/* This always says "saved" — there's no actual save happening yet. Swap this
            in once the backend confirms the session was persisted, and probably show
            something different if that call fails. */}
        <p className="finished-save-note">
          <Save size={22} aria-hidden="true" />
          Your reading session has been saved.
        </p>

        <div className="finished-avatar">
          <img
            className="avatar-media"
            src="/images/Avatar_Image_nobg.png"
            alt="Reading companion avatar"
          />
        </div>

        <button className="finished-return-btn" onClick={onReturnToStories}>
          <Undo2 size={20} aria-hidden="true" />
          Return to Choosing Stories
        </button>

        <div className="finished-message">
          <p>
            Thank you for reading and sharing your thoughts with me. I really
            enjoyed hearing what you think!
            <br />
            Would you like to read more stories with me?
          </p>
        </div>
      </div>
    </div>
  );
}

export default FinishedPage;
