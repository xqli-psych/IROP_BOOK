
import React from "react";
import "./InstructionPage.css";

function InstructionPage({ onStart, storyTitle }) {
  return (
    <div className="instruction-page">

      <header className="instruction-header">
        <h1>
          {storyTitle || "There's an Alligator Under My Bed"}
        </h1>
        <p>Before we begin</p>
      </header>

      <main className="instruction-main">

        <div className="instruction-intro">
          <h2>You are the storyteller!</h2>
          <p>Let's read a story together with Alice.</p>
        </div>

        <div className="instruction-card">

          <div className="instruction-step">
            <div className="instruction-number">1</div>

            <div className="instruction-step-text">
              <h3>Read the story</h3>
              <p>
                Look at the pictures and tell Alice
                what is happening in the story
                in your own words.
              </p>
            </div>
          </div>

          <div className="instruction-divider" />

          <div className="instruction-step">
            <div className="instruction-number">2</div>

            <div className="instruction-step-text">
              <h3>Talk with Alice</h3>
              <p>
                Alice will ask you questions about
                the story and its characters.
                Share what you think with her.
              </p>
            </div>
          </div>

          <div className="instruction-divider" />

          <div className="instruction-step">
            <div className="instruction-number">3</div>

            <div className="instruction-step-text">
              <h3>Enjoy the conversation</h3>
              <p>
                There are no right or wrong answers.
                Take your time and enjoy reading together.
              </p>
            </div>
          </div>

        </div>

        <div className="instruction-footer">
          <button
            type="button"
            className="instruction-start-btn"
            onClick={onStart}
          >
            Start Reading
            <span aria-hidden="true">→</span>
          </button>

          <p>
            Take your time. Start whenever you're ready.
          </p>
        </div>

      </main>

    </div>
  );
}

export default InstructionPage;
