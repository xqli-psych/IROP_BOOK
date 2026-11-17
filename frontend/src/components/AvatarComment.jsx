function AvatarComment({ comment }) {
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
        <span className="comment-author-badge">👧 Alice says:</span>
        <p className="comment-text">{comment}</p>
      </div>
    </div>
  );
}

export default AvatarComment;
