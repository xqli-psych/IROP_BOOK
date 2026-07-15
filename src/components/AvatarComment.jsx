function AvatarComment({ videoSrc, comment }) {
  return (
    <div className="avatar-comment">

      <div className="comment-bubble">
        {comment}
      </div>
    </div>
  );
}

export default AvatarComment;