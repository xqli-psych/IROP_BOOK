function MSTPrompt({ prompt, videoSrc, onSkip, onSubmit }) {
  return (
    <div className="mst-prompt-panel">
      <p className="mst-question">{prompt}</p>

      <div className="answer-box">
        <label>Type your answer:</label>
        <input type="text" />

        <button onClick={onSubmit}>
          Submit
        </button>
      </div>

      <button className="skip-btn" onClick={onSkip}>
        Skip for now
      </button>
    </div>
  );
}

export default MSTPrompt;