import { Play } from "lucide-react";

function WelcomePage({ onStart }) {
  return (
    <div className="app welcome-page">
      <header className="welcome-header">
        <h1>Let’s Read!</h1>

        <p>
          Take your time, get comfortable, and enjoy a story with me.
          We can pause along the way to share what we think and feel.
        </p>
      </header>

      <div className="welcome-body">
        <div className="welcome-avatar">
          <img
            className="avatar-media"
            src="/images/Avatar_Image_nobg.png"
            alt="Reading companion avatar"
          />
        </div>

        <div className="welcome-message">
          <p>
            Hello! I’m happy to read with you today.
            Whenever you’re ready, we can begin.
          </p>

          <button onClick={onStart}>
            <Play size={26} aria-hidden="true" />
            Start Reading
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomePage;