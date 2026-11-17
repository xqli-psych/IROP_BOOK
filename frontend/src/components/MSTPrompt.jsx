import { useState } from "react";
import { Mic, Square, ArrowLeft, Send } from "lucide-react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { apiClient } from "../utils/apiClient";
import { useSession } from "../hooks/useSession";

function MSTPrompt({ prompt, reaction, avatarComment, onBack, onSkip, onContinue, pageId, storyPageText }) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiReaction, setAiReaction] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState(null);
  const [isFollowUpAnswered, setIsFollowUpAnswered] = useState(false);

  const { sessionId } = useSession();
  const { isRecording, audioBlob, startRecording, stopRecording, clearAudio } = useAudioRecorder();

  const handleSubmit = async () => {
    if (!answer.trim() && !audioBlob) return;
    setIsProcessing(true);

    const isAnsweringFollowUp = Boolean(followUpQuestion && !isFollowUpAnswered);

    const formData = new FormData();
    formData.append("sessionId", sessionId);
    formData.append("pageId", pageId);
    formData.append("storyPageText", storyPageText);
    formData.append("questionText", isAnsweringFollowUp ? followUpQuestion : (prompt || ""));
    formData.append("expectedEmotion", reaction || "");
    formData.append("visualSceneContext", avatarComment || "");
    formData.append("isFollowUp", isAnsweringFollowUp ? "true" : "false");

    if (audioBlob) {
      formData.append("audioFile", audioBlob, "recording.webm");
    } else {
      formData.append("transcriptText", answer);
    }

    try {
      const response = await apiClient.analyzeReading(formData);
      
      if (response.success) {
        setAiReaction(response.childResponse);
        
        if (response.audioBase64) {
          const audio = new Audio("data:audio/wav;base64," + response.audioBase64);
          audio.play();
        }

        if (isAnsweringFollowUp) {
          // Finished answering the personal follow-up question
          setIsFollowUpAnswered(true);
          setSubmitted(true);
        } else if (response.followUpQuestion) {
          // Received a new follow-up question because answer was incorrect/partial/no-mst
          setFollowUpQuestion(response.followUpQuestion);
          setAnswer(""); // clear input for the follow-up answer
        } else {
          // Correct answer: no follow-up needed
          setSubmitted(true);
        }
      }
    } catch (err) {
      console.error("Failed to analyze reading:", err);
      alert("Something went wrong while processing your response.");
    } finally {
      setIsProcessing(false);
      clearAudio();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  };

  // Determine active question to display in the top banner
  const displayedQuestion = (followUpQuestion && !isFollowUpAnswered)
    ? followUpQuestion
    : prompt;

  // Determine if input is active (either before first submission or while answering follow-up)
  const showInput = !submitted;

  return (
    <>
      <div className="mst-question-wrapper">
        <div className="mst-question-panel">
          {followUpQuestion && !isFollowUpAnswered && (
            <span style={{ display: "block", fontSize: "15px", color: "#6c757d", fontWeight: "bold", marginBottom: "6px" }}>
              Alice asks you:
            </span>
          )}
          <p className="mst-question">{displayedQuestion}</p>
        </div>

        <div className="mst-question-actions">
          {submitted || followUpQuestion ? (
            <button className="mst-continue-btn" onClick={onContinue} disabled={isProcessing}>
              Continue
            </button>
          ) : (
            <>
              <button className="mst-back-btn" onClick={onBack} disabled={isProcessing}>
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </button>
              <button className="mst-skip-btn" onClick={onSkip} disabled={isProcessing}>
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mst-bottom-row">
        <img
          className="avatar-video"
          src="/images/Avatar_Image_nobg.png"
          alt="Reading companion avatar"
        />

        {showInput ? (
          <div className="mst-answer-panel">
            {followUpQuestion && !isFollowUpAnswered && aiReaction && (
              <div
                style={{
                  marginBottom: "10px",
                  fontSize: "15px",
                  lineHeight: "1.35",
                  color: "#333",
                  background: "#fdf8f0",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  borderLeft: "4px solid #e8c28f",
                }}
              >
                <strong>Alice:</strong> {aiReaction}
              </div>
            )}
            <label htmlFor="mst-answer">
              {isProcessing
                ? "The child is thinking..."
                : followUpQuestion
                ? "Share your personal thoughts with Alice (or click Continue):"
                : "Type or say your answer:"}
            </label>
            <div className="mst-answer-row">
              <input
                id="mst-answer"
                type="text"
                placeholder={
                  isRecording
                    ? "Recording audio..."
                    : audioBlob
                    ? "Audio recorded. Press send."
                    : followUpQuestion
                    ? "Type your experience here..."
                    : ""
                }
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRecording || isProcessing || !!audioBlob}
              />
              
              {/* Dynamic button logic based on recording/typing state */}
              {audioBlob || answer.trim().length > 0 ? (
                <button
                  type="button"
                  className="mst-mic-btn"
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  title="Send Answer"
                >
                  <Send size={20} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className={`mst-mic-btn ${isRecording ? "recording" : ""}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  title={isRecording ? "Stop Recording" : "Start Recording"}
                >
                  {isRecording ? <Square size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mst-reaction-panel">
            <p>{aiReaction || reaction}</p> 
          </div>
        )}
      </div>
    </>
  );
}

export default MSTPrompt;
