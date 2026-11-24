import { Volume2, ArrowRight } from "lucide-react";

function AvatarComment({ comment, onReplay, onProceed, hasAudio = false }) {
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
              <span>Listen again</span>
            </button>
          )}
        </div>
        <p className="comment-text">{comment}</p>

        {onProceed && (
          <div className="comment-footer-row">
            <button
              type="button"
              className="comment-proceed-btn"
              onClick={onProceed}
              title="Continue to question"
            >
              <span>Continue to prompt</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AvatarComment;
