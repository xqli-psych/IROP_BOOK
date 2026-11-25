
import React from "react";
import "./InstructionPage.css";

export default function InstructionPage({ onStart }) {
  return (
    <div className="instruction-page">
      <div className="instruction-card">
        <div className="instruction-icon">📖</div>

        <h1>Let's Read a Story Together!</h1>
        <h2>You are the storyteller!</h2>

        <div className="instruction-steps">
          <div className="instruction-step">
            <span>📖</span>
            <div>
              <h3>1. Tell me the story</h3>
              <p>
                Look at the pictures and tell me what's
                happening, just like you're reading to a child.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span>💬</span>
            <div>
              <h3>2. Answer my questions</h3>
              <p>
                I'll ask you questions about the story
                and its characters.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span>❤️</span>
            <div>
              <h3>3. Let's talk about the characters!</h3>
              <p>
                We can explore what the characters might
                be thinking, feeling, or wanting.
              </p>
            </div>
          </div>
        </div>

        <p className="instruction-note">
          There are no right or wrong answers.
          Just share what you think!
        </p>

        <button
          className="instruction-start"
          onClick={onStart}
        >
          Start Reading →
        </button>
      </div>
    </div>
  );
}
