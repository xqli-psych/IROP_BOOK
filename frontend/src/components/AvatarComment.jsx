import { Volume2 } from "lucide-react";

function AvatarComment({ comment, onReplay, hasAudio = false }) {
  return (
    <div className="avatar-comment">
      <div className="avatar-frame">
        <img
          className="avatar-video"
          src="/images/Avatar_Image_nobg.png"
          alt="Reading companion avatar"
        />
      </div>

      <div className="comment-bubble">
        <div className="comment-header-row">
          <span className="comment-author-badge">Alice says:</span>
          {hasAudio && (
            <button
              type="button"
              className="comment-listen-btn"
              onClick={onReplay}
              title="Listen to Alice speak"
              aria-label="Listen to Alice speak"
            >
              <Volume2 size={15} />
              <span>Listen</span>
            </button>
          )}
        </div>
        <p className="comment-text">{comment}</p>
      </div>
    </div>
  );
}

export default AvatarComment;
