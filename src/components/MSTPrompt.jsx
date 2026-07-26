import { useState } from "react";
import { Mic } from "lucide-react";

function MSTPrompt({ prompt, reaction, onBack, onSkip, onContinue }) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    setSubmitted(true);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <>
      <div className="mst-question-panel">
        <p className="mst-question">{prompt}</p>

        <div className={`mst-question-actions${submitted ? " mst-question-actions-continue" : ""}`}>
          {submitted ? (
            <button className="mst-continue-btn" onClick={onContinue}>
              Continue
            </button>
          ) : (
            <>
              <button className="mst-back-btn" onClick={onBack}>
                ← Back
              </button>
              <button className="mst-skip-btn" onClick={onSkip}>
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>

      {submitted ? (
        <div className="mst-reaction-panel">
          <p>{reaction}</p>
        </div>
      ) : (
        <div className="mst-answer-panel">
          <label htmlFor="mst-answer">Type or say your answer:</label>
          <div className="mst-answer-row">
            <input
              id="mst-answer"
              type="text"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            {/* Voice input is out of scope for this prototype — decorative only. */}
            <button
              type="button"
              className="mst-mic-btn"
              aria-label="Voice input (not available yet)"
            >
              <Mic size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default MSTPrompt;
