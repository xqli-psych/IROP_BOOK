import { ChevronLeft, ChevronRight } from "lucide-react";

function TranscriptDrawer({ isOpen, onToggle, transcript }) {
  return (
    <div className={`transcript-drawer${isOpen ? " transcript-drawer-open" : ""}`}>
      <div className="transcript-panel" id="transcript-panel">
        <h3>Story Transcript</h3>
        <p>{transcript}</p>
      </div>

      <button
        className="transcript-tab"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="transcript-panel"
        aria-label={isOpen ? "Close transcript" : "Open transcript"}
      >
        <span className="transcript-tab-icon" aria-hidden="true">
          {isOpen ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
        </span>
      </button>
    </div>
  );
}

export default TranscriptDrawer;
