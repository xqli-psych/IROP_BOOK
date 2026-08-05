function AvatarComment({ comment }) {
  return (
    <div className="avatar-comment">
      {/* TODO: swap for a <video> once real avatar clips are supplied. */}
      <img
        className="avatar-video"
        src="/images/Avatar_Image_nobg.png"
        alt="Reading companion avatar"
      />

      <div className="comment-bubble">
        {comment}
      </div>
    </div>
  );
}

export default AvatarComment;