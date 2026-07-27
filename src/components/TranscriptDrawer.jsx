import { FileText } from "lucide-react";

function TranscriptDrawer({ isOpen, onToggle, transcript }) {
  const paragraphs = transcript.split("\n").filter((paragraph) => paragraph.trim());

  return (
    <div className={`transcript-drawer${isOpen ? " transcript-drawer-open" : ""}`}>
      <div className="transcript-panel" id="transcript-panel">
        <h3>Story Transcript</h3>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <button
        className="transcript-tab"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="transcript-panel"
        aria-label={isOpen ? "Close transcript" : "Open transcript"}
      >
        <span className="transcript-tab-icon" aria-hidden="true">
          <FileText size={22} />
        </span>
      </button>
    </div>
  );
}

export default TranscriptDrawer;
