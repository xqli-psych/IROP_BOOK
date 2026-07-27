import { ArrowLeft } from "lucide-react";

import "../styles/SessionSetupPage.css";

function SessionSetupPage({ onContinue, onBack }) {
  return (
    <div className="app session-page">
      <header className="session-header">
        <h1>Let’s Get Started</h1>

        <p className="session-subtitle">
          Please enter the session code provided to you.
        </p>
      </header>

      <div className="session-form">
        <label htmlFor="session-code">Session code:</label>

        <input
          id="session-code"
          type="text"
          placeholder="e.g. T-10001"
        />

        <p className="session-note">
          This helps us save your reading activity for this session.
        </p>
      </div>

      <div className="session-actions">
        <button className="back-action" onClick={onBack}>
          <ArrowLeft size={26} aria-hidden="true" />
          Back
        </button>

        <button className="continue-action" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}

export default SessionSetupPage;