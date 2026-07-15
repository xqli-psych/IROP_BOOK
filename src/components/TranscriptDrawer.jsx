function TranscriptDrawer({ open, transcript, onToggle }) {
  if (!open) {
    return (
      <button className="transcript-tab" onClick={onToggle}>
        📄
      </button>
    );
  }

  return (
    <aside className="transcript-drawer">
      <p>{transcript}</p>

      <button className="transcript-close" onClick={onToggle}>
        Close
      </button>
    </aside>
  );
}

export default TranscriptDrawer;