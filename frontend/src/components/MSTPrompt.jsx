import { useState } from "react";
import { Mic, Square, ArrowLeft, Send } from "lucide-react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { apiClient } from "../utils/apiClient";
import { useSession } from "../hooks/useSession";

function MSTPrompt({ prompt, reaction, onBack, onSkip, onContinue, pageId, storyPageText }) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiReaction, setAiReaction] = useState("");

  const { sessionId } = useSession();
  const { isRecording, audioBlob, startRecording, stopRecording, clearAudio } = useAudioRecorder();

  const handleSubmit = async () => {
    if (!answer.trim() && !audioBlob) return;
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("sessionId", sessionId);
    formData.append("pageId", pageId);
    formData.append("storyPageText", storyPageText);

    if (audioBlob) {
      formData.append("audioFile", audioBlob, "recording.webm");
    } else {
      formData.append("transcriptText", answer);
    }

    try {
      const response = await apiClient.analyzeReading(formData);
      
      if (response.success) {
        setAiReaction(response.childResponse);
        setSubmitted(true);
        
        if (response.audioBase64) {
          const audio = new Audio("data:audio/wav;base64," + response.audioBase64);
          audio.play();
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

  return (
    <>
      <div className="mst-question-wrapper">
        <div className="mst-question-panel">
          <p className="mst-question">{prompt}</p>
        </div>

        <div className="mst-question-actions">
          {submitted ? (
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

        {submitted ? (
          <div className="mst-reaction-panel">
            {/* Fallback to original reaction prop if the AI fails to generate one */}
            <p>{aiReaction || reaction}</p> 
          </div>
        ) : (
          <div className="mst-answer-panel">
            <label htmlFor="mst-answer">
              {isProcessing ? "The child is thinking..." : "Type or say your answer:"}
            </label>
            <div className="mst-answer-row">
              <input
                id="mst-answer"
                type="text"
                placeholder={isRecording ? "Recording audio..." : audioBlob ? "Audio recorded. Press send." : ""}
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
        )}
      </div>
    </>
  );
}

export default MSTPrompt;