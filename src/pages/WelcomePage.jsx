function WelcomePage({ onStart }) {
  return (
    <div className="app welcome-page">
      <h1>Let’s Read!</h1>

      <p>
        Take your time, get comfortable, and enjoy a story with me.
        We can pause along the way to share what we think and feel.
      </p>

    <div className="welcome-avatar">
    Avatar Placeholder
    </div>

      <div className="welcome-message">
        <p>
          Hello! I’m happy to read with you today.
          Whenever you’re ready, we can begin.
        </p>

        <button onClick={onStart}>
          Start Reading
        </button>
      </div>
    </div>
  );
}

export default WelcomePage;