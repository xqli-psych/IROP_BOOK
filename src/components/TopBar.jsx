import { ArrowLeft } from "lucide-react";

function TopBar({ title, part, totalParts, onContinue, showContinue = true, onPause }) {
  return (
    <header className="top-bar">
      <button className="pause-btn" onClick={onPause}>
        <ArrowLeft size={18} aria-hidden="true" />
        <span>Pause/End<br />Session</span>
      </button>

      <div className="top-center">
        <h1>{title}</h1>

        <div className="progress-row">
          <span>Progress:</span>
          <div className="progress-track">
            <div className="progress-fill"></div>
          </div>
          <span>Part {part} of {totalParts}</span>
        </div>
      </div>

      {showContinue ? (
        <button className="continue-btn" onClick={onContinue}>
          Continue
        </button>
      ) : (
        <div className="continue-btn-spacer" aria-hidden="true" />
      )}
    </header>
  );
}

export default TopBar;