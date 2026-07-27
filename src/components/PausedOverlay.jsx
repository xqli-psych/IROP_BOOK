import { Pause, Save, Play } from "lucide-react";

function PausedOverlay({ onKeepReading, onSaveExit }) {
  return (
    <div className="paused-overlay">
      <div className="paused-indicator">
        <span className="paused-icon" aria-hidden="true">
          <Pause size={28} />
        </span>
        <span className="paused-label">Paused</span>
      </div>

      <div className="paused-actions">
        <button className="paused-save-btn" onClick={onSaveExit}>
          <Save size={20} aria-hidden="true" />
          Save & Exit Session
        </button>

        <button className="paused-resume-btn" onClick={onKeepReading}>
          <Play size={20} aria-hidden="true" />
          Keep Reading
        </button>
      </div>
    </div>
  );
}

export default PausedOverlay;
