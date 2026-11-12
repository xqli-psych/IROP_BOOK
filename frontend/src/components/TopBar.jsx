
import { ArrowLeft } from "lucide-react";

function TopBar({
  title,
  part,
  totalParts,
  onContinue,
  showContinue = true,
  onPause,
}) {
  // Calculate progress percentage based on the current page
  const progressPercentage =
    totalParts > 0
      ? Math.min(100, Math.max(0, (part / totalParts) * 100))
      : 0;

  return (
    <header className="top-bar">
      <button className="pause-btn" onClick={onPause}>
        <ArrowLeft size={18} aria-hidden="true" />
        <span>
          Pause/End<br />Session
        </span>
      </button>

      <div className="top-center">
        <h1>{title}</h1>

        <div className="progress-row">
          <span>Progress:</span>

          <div
            className="progress-track"
            role="progressbar"
            aria-label="Story reading progress"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="progress-fill"
              style={{
                width: `${progressPercentage}%`,
              }}
            ></div>
          </div>

          <span>
            Part {part} of {totalParts}
          </span>
        </div>
      </div>

      {showContinue ? (
        <button className="continue-btn" onClick={onContinue}>
          Continue
        </button>
      ) : (
        <div
          className="continue-btn-spacer"
          aria-hidden="true"
        />
      )}
    </header>
  );
}

export default TopBar;
