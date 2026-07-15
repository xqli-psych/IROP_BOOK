import "../styles/StoryPreviewPage.css";

function StoryPreviewPage({ story, onBack, onBegin }) {
  return (
    <div className="app story-preview-page">
      <section className="preview-left">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>

        <div className="preview-cover">
          <img
            src="/images/alligator-cover-page.jpg"
            alt={story.title}
          />
        </div>

        <p className="preview-time">◷ {story.time}</p>
      </section>

      <section className="preview-right">
        <div className="preview-info">
          <h1>Story Title</h1>
          <p>{story.title}</p>

          <h2>Author</h2>
          <p>{story.author}</p>

          <h2>Genre/Themes</h2>
          <p>{story.genre}</p>

          <h2>Short Description</h2>
          <p>
            This book is about an alligator. There is a boy who has an
            alligator under his bed. The boy is trying to keep the alligator
            from biting him. So he figures out a way to trap him.
          </p>
        </div>

        <div className="preview-bottom">
          <p className="preview-note">
            We’ll pause sometimes to chat about the story and share what we
            think the characters are feeling.
          </p>

          <button className="begin-reading-btn" onClick={onBegin}>
            Begin Reading
          </button>
        </div>
      </section>
    </div>
  );
}

export default StoryPreviewPage;