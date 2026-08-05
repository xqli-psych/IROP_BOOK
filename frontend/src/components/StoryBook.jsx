function StoryBook({ leftImage, rightImage, faded }) {
  return (
    <section className={`story-book ${faded ? "faded" : ""}`}>
      <img src={leftImage} alt="Left story page" />
      <img src={rightImage} alt="Right story page" />
    </section>
  );
}

export default StoryBook;