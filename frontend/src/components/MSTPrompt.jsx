import { useState } from "react";
import { Mic, Square, ArrowLeft, Send, AlertCircle, X, Volume2 } from "lucide-react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { apiClient } from "../utils/apiClient";
import { useSession } from "../hooks/useSession";

function MSTPrompt({
  prompt,
  followUpQuestionProp,
  reaction,
  avatarComment,
  onReplayComment,
  hasCommentAudio = false,
  onBack,
  onSkip,
  onContinue,
  pageId,
  storyPageText,
}) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiReaction, setAiReaction] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState(null);
  const [isFollowUpAnswered, setIsFollowUpAnswered] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { sessionId } = useSession();
  const { isRecording, audioBlob, startRecording, stopRecording, clearAudio } = useAudioRecorder();

  /**
   * Plays the audio synthesized by Orpheus, applying pitch and cadence shifting
   * so Alice's voice sounds authentically childlike (higher pitch & lively pacing).
   */
  const playChildVoiceAudio = (base64Wav) => {
    try {
      const audio = new Audio("data:audio/wav;base64," + base64Wav);
      audio.preservesPitch = false;
      audio.mozPreservesPitch = false;
      audio.webkitPreservesPitch = false;
      audio.playbackRate = 1.18;
      audio.play().catch((err) => {
        console.warn("Audio autoplay blocked by browser policy:", err);
      });
    } catch (err) {
      console.warn("Error playing child voice audio:", err);
    }
  };

  const isAnsweringFollowUp = Boolean(followUpQuestion && !isFollowUpAnswered);

  const handleSubmit = async () => {
    if (!answer.trim() && !audioBlob) return;
    setIsProcessing(true);
    setErrorMessage("");

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
          playChildVoiceAudio(response.audioBase64);
        }

        if (isAnsweringFollowUp) {
          // Finished answering the book follow-up question
          setIsFollowUpAnswered(true);
          setSubmitted(true);
        } else if (response.followUpQuestion) {
          // Reader missed MST or gave incorrect emotion: present the book follow-up question
          setFollowUpQuestion(response.followUpQuestion);
          setAnswer(""); // clear input for second answer
        } else {
          // Correct answer with spontaneous MST: no follow-up needed
          setSubmitted(true);
        }
      }
    } catch (err) {
      console.error("Failed to analyze reading:", err);
      setErrorMessage("Something went wrong while processing your response. Please try sending again.");
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

  // Determine active prompt or question to display in the top banner
  const displayedPrompt = isAnsweringFollowUp ? followUpQuestion : prompt;
  const showInput = !submitted;

  return (
    <>
      {errorMessage && (
        <div className="mst-error-toast" role="alert">
          <div className="mst-error-toast-content">
            <AlertCircle size={18} className="mst-error-icon" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            className="mst-error-toast-close"
            onClick={() => setErrorMessage("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mst-question-wrapper">
        <div className="mst-question-panel">
          <div className="mst-badge-row">
            <span className={`mst-question-badge ${isAnsweringFollowUp ? "mst-question-badge-followup" : ""}`}>
              {isAnsweringFollowUp ? "Question from Alice" : "Prompt for you"}
            </span>
          </div>
          <p className="mst-question">{displayedPrompt}</p>
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
        <div className="avatar-frame">
          <img
            className="avatar-video"
            src="/images/Avatar_Image_nobg.png"
            alt="Reading companion avatar"
          />
        </div>

        {showInput ? (
          <div className="mst-answer-panel">
            {/* Alice's Visual Comment (or reaction quote) shown cleanly above input */}
            {!isAnsweringFollowUp && avatarComment && (
              <div className="mst-avatar-quote-bubble">
                <div className="mst-quote-header">
                  <span className="mst-quote-author">Alice says:</span>
                  {hasCommentAudio && onReplayComment && (
                    <button
                      type="button"
                      className="mst-quote-listen-btn"
                      onClick={onReplayComment}
                      title="Listen to Alice speak"
                      aria-label="Listen to Alice speak"
                    >
                      <Volume2 size={13} />
                      <span>Listen</span>
                    </button>
                  )}
                </div>
                <p className="mst-quote-text">{avatarComment}</p>
              </div>
            )}

            {isAnsweringFollowUp && aiReaction && (
              <div className="mst-avatar-quote-bubble">
                <span className="mst-quote-author">Alice says:</span>
                <p className="mst-quote-text">{aiReaction}</p>
              </div>
            )}

            <label htmlFor="mst-answer" className="mst-answer-label">
              {isProcessing ? (
                <span className="mst-thinking-indicator">
                  <span className="mst-thinking-dot"></span>
                  <span className="mst-thinking-dot"></span>
                  <span className="mst-thinking-dot"></span>
                  Alice is listening and thinking...
                </span>
              ) : isAnsweringFollowUp ? (
                "Answer Alice's question:"
              ) : (
                "Tell Alice what you think:"
              )}
            </label>
            <div className="mst-answer-row">
              <input
                id="mst-answer"
                type="text"
                placeholder={
                  isRecording
                    ? "Recording audio... click square when done."
                    : audioBlob
                    ? "Audio recorded. Click send!"
                    : isAnsweringFollowUp
                    ? "Type your answer to Alice's question..."
                    : "Type what you think here..."
                }
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRecording || isProcessing || !!audioBlob}
              />
              
              {audioBlob || answer.trim().length > 0 ? (
                <button
                  type="button"
                  className="mst-send-btn"
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  title="Send Answer"
                >
                  <Send size={18} aria-hidden="true" />
                  <span>Send</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={`mst-mic-btn ${isRecording ? "recording" : ""}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  title={isRecording ? "Stop Recording" : "Start Recording (Voice)"}
                >
                  {isRecording ? <Square size={18} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mst-reaction-panel">
            <span className="mst-reaction-badge">Alice says:</span>
            <p>{aiReaction || reaction}</p> 
          </div>
        )}
      </div>
    </>
  );
}

export default MSTPrompt;
