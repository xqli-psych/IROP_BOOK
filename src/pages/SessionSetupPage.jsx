import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { apiClient } from "../utils/apiClient";
import { useSession } from "../hooks/useSession";

function SessionSetupPage({ onContinue, onBack }) {
  const [participationId, setParticipationId] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { saveSession } = useSession();

  const handleContinueClick = async () => {
    if (!participationId.trim() || !sessionCode.trim()) {
      setError("Please enter both the participation ID and session code.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await apiClient.loginSession(sessionCode, participationId);

      if (response.success && response.data) {
        // Persist the generated session_id in sessionStorage
        saveSession(response.data.id);
        // Advance to the StorySelectionPage
        onContinue();
      } else {
        setError("Invalid session code.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app session-page">
      <header className="session-header">
        <h1>Let’s Get Started</h1>

        <p className="session-subtitle">
          Please enter the participation ID and session code provided to you.
        </p>
      </header>

      <div className="session-form">
        <div className="session-field">
          <label htmlFor="participation-id">Participation ID:</label>
          <input
            id="participation-id"
            type="text"
            placeholder="e.g. P-2044"
            value={participationId}
            onChange={(e) => setParticipationId(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="session-field">
          <label htmlFor="session-code">Session code:</label>
          <input
            id="session-code"
            type="text"
            placeholder="e.g. T-10001"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Inline error display */}
        {error && (
          <p className="error-message" style={{ color: "red", marginTop: "8px", marginBottom: "0" }}>
            {error}
          </p>
        )}

        <p className="session-note">
          This helps us save your reading activity for this session.
        </p>
      </div>

      <div className="session-actions">
        <button className="back-action" onClick={onBack} disabled={isLoading}>
          <ArrowLeft size={26} aria-hidden="true" />
          Back
        </button>

        <button 
          className="continue-action" 
          onClick={handleContinueClick} 
          disabled={isLoading}
        >
          {isLoading ? "Connecting..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

export default SessionSetupPage;