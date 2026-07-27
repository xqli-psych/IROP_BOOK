// Stand-in for whatever a "get story" endpoint will eventually return. Once the
// backend is up, this whole object (and the totalParts/pages split) should come
// from the API instead of living here — don't build more mock stories, wire up
// the real fetch instead.
export const mockStory = {
  id: "alligator",
  title: "There’s an Alligator Under My Bed",
  author: "Mercer Mayer",
  genre: "Humor, Animals, Fantasy",
  time: "8 mins",
  totalParts: 5,
  pages: [
    {
      part: 1,
      leftImage: "/images/alligator-page-1.png",
      rightImage: "/images/alligator-page-2.png",
      transcript:
        "There used to be an alligator under my bed. When it was time to go to sleep, I had to be very careful so I’d call Mom and Dad. But they never saw it. It was up to me. I just had to do something about that alligator.\nSo I went to the kitchen to get some alligator bait. I filled a paper bag full of things alligators like to eat. I put a peanut butter sandwich, some fruit, and the last piece of pie in the garage. I put cookies down the hall. I left fresh vegetables on the stairs. I put a soda and some candy next to my bed. Then I watched and waited.",
      avatarComment:
        "Oh no... there’s really an alligator under the bed! I wonder what he will do.",
      mstPrompt:
        "How do you think the boy feels about the alligator under his bed? Why do you think he feels that way?",
      mstResponse:
        "I think so too! It would feel scary if you thought there was an alligator under your bed."
    }
  ]
};