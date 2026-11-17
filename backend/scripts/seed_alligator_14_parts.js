import "../config/env.js";
import { supabase } from "../config/supabase.js";

const storyId = "11111111-1111-1111-1111-111111111111";

const story = {
  id: storyId,
  title: "There's an Alligator Under My Bed",
  author: "Mercer Mayer",
  genre: "Children",
  estimated_time: "10 mins",
  total_parts: 14,
};

const pages = [
  {
    story_id: storyId,
    page_number: 1,
    left_image_url: "/images/alligator-page-1.png",
    right_image_url: "/images/alligator-page-2.png",
    page_text: "There used to be an alligator under my bed.",
    avatar_comment: "Oh wow, look at his face! Why is he carrying that big wooden board into his room?",
    mst_prompt: "How do you think the boy feels about going to bed when he believes an alligator is under there?",
    mst_response: "He probably feels scared and worried that the alligator will get him!",
  },
  {
    story_id: storyId,
    page_number: 2,
    left_image_url: "/images/alligator-page-3.png",
    right_image_url: "/images/alligator-page-4.png",
    page_text: "When it was time to go to sleep, I had to be very careful because I knew he was there.",
    avatar_comment: "Whoa! He used the board like a bridge so his feet wouldn't touch the floor!",
    mst_prompt: "Why do you think the boy has to be very careful?",
    mst_response: "Because he is afraid the alligator might bite his toes if he steps on the floor!",
  },
  {
    story_id: storyId,
    page_number: 3,
    left_image_url: "/images/alligator-page-5.png",
    right_image_url: "/images/alligator-page-6.png",
    page_text: "But whenever I looked, he hid... or something. So I'd call Mom and Dad.",
    avatar_comment: "That sneaky alligator hid right when he looked! No wonder he is yelling for his parents!",
    mst_prompt: "How do you think the boy feels when he looks under the bed and can't see the alligator?",
    mst_response: "He feels nervous and wants his parents to come protect him.",
  },
  {
    story_id: storyId,
    page_number: 4,
    left_image_url: "/images/alligator-page-7.png",
    right_image_url: "/images/alligator-page-8.png",
    page_text: "But they never saw it. It was up to me. I just had to do something about that alligator.",
    avatar_comment: "Grown-ups never see the monsters! Look how brave he is climbing out of bed by himself!",
    mst_prompt: "What are Mom and Dad thinking when they look under the bed?",
    mst_response: "They think he is just imagining things and that there is no alligator.",
  },
  {
    story_id: storyId,
    page_number: 5,
    left_image_url: "/images/alligator-page-9.png",
    right_image_url: "/images/alligator-page-10.png",
    page_text: "So I went to the kitchen to get some alligator bait.",
    avatar_comment: "Ooh, he is getting all kinds of yummy food from the fridge!",
    mst_prompt: "What is the boy planning to do with the alligator bait?",
    mst_response: "He wants to trick the hungry alligator into coming out from under his bed.",
  },
  {
    story_id: storyId,
    page_number: 6,
    left_image_url: "/images/alligator-page-11.png",
    right_image_url: "/images/alligator-page-12.png",
    page_text: "I put a peanut butter sandwich, some fruit, and the last piece of pie in the garage.",
    avatar_comment: "Look at his proud little smile! He is setting up a yummy trap in the garage!",
    mst_prompt: "Why did the boy decide to put the food all the way in the garage?",
    mst_response: "Because he wants to lure the alligator all the way out of the house!",
  },
  {
    story_id: storyId,
    page_number: 7,
    left_image_url: "/images/alligator-page-13.png",
    right_image_url: "/images/alligator-page-14.png",
    page_text: "I put cookies down the hall. I left fresh vegetables on the stairs.",
    avatar_comment: "Hehehe! He is making a whole trail of snacks down the stairs!",
    mst_prompt: "What does the boy think the alligator will do when it sees this trail of food?",
    mst_response: "He thinks the alligator will follow the snacks step by step down the stairs.",
  },
  {
    story_id: storyId,
    page_number: 8,
    left_image_url: "/images/alligator-page-15.png",
    right_image_url: "/images/alligator-page-16.png",
    page_text: "I put a soda and some candy next to my bed. Then I watched and waited. Sure enough, out he came to get something to eat.",
    avatar_comment: "Whoa, it worked! The alligator is coming right out for the candy and soda!",
    mst_prompt: "How do you think the boy feels as he watches the alligator finally crawl out?",
    mst_response: "He probably feels a little nervous, but also excited that his smart plan is working!",
  },
  {
    story_id: storyId,
    page_number: 9,
    left_image_url: "/images/alligator-page-17.png",
    right_image_url: "/images/alligator-page-18.png",
    page_text: "Then I hid in the hall closet. I followed him down the stairs.",
    avatar_comment: "Hehehe, look at the boy peeking out from the closet door!",
    mst_prompt: "Why did the boy hide in the closet while the alligator walked by?",
    mst_response: "Because he didn't want the alligator to see him and get scared away or chase him.",
  },
  {
    story_id: storyId,
    page_number: 10,
    left_image_url: "/images/alligator-page-19.png",
    right_image_url: "/images/alligator-page-20.png",
    page_text: "I followed him down the hall.",
    avatar_comment: "Look at the alligator's happy face while he munches those cookies!",
    mst_prompt: "How is the alligator feeling right now as he eats the trail of cookies?",
    mst_response: "The alligator feels super happy and hungry, and has no idea he is walking into a trap!",
  },
  {
    story_id: storyId,
    page_number: 11,
    left_image_url: "/images/alligator-page-21.png",
    right_image_url: "/images/alligator-page-22.png",
    page_text: "When he crawled into the garage,",
    avatar_comment: "Ooh! The alligator is crawling right into the garage! Look at the boy hiding behind the door!",
    mst_prompt: "What is the boy waiting and hoping for as he hides behind the garage door?",
    mst_response: "He is waiting for the alligator's tail to go all the way inside so he can shut the door!",
  },
  {
    story_id: storyId,
    page_number: 12,
    left_image_url: "/images/alligator-page-23.png",
    right_image_url: "/images/alligator-page-24.png",
    page_text: "I slammed the door and locked it. Then I went to bed. There wasn't even any mess to clean up.",
    avatar_comment: "Yay! Look at him throwing his hands up in the air! He did it!",
    mst_prompt: "How does the boy feel right after locking the alligator in the garage?",
    mst_response: "He feels super proud, relieved, and happy that his room is finally safe!",
  },
  {
    story_id: storyId,
    page_number: 13,
    left_image_url: "/images/alligator-page-25.png",
    right_image_url: "/images/alligator-page-26.png",
    page_text: "Now that there is an alligator in the garage, I wonder if my dad will have any trouble getting in his car tomorrow morning.",
    avatar_comment: "Uh-oh! He doesn't need his wooden board anymore, but now the alligator is by Dad's car!",
    mst_prompt: "What is the boy worried might happen to his dad in the morning?",
    mst_response: "He is worried that his dad will be surprised or scared by the alligator in the garage!",
  },
  {
    story_id: storyId,
    page_number: 14,
    left_image_url: "/images/alligator-page-27.png",
    right_image_url: "/images/alligator-page-27.png",
    page_text: 'I\'ll just leave him a note. "DEAR DAD, THERE IS AN ALLIGATOR IN THE GARAGE. IF YOU NEED HELP WAKE ME UP. WARNING BE CAREFUL."',
    avatar_comment: "Hehehe! Look at the funny picture and warning note he taped to the door for his dad!",
    mst_prompt: "Why did the boy leave a note offering to help his dad?",
    mst_response: "Because he loves his dad, wants to warn him to be careful, and feels brave enough to help!",
  },
];

async function seed() {
  console.log("Upserting story (total_parts = 14)...");
  const { error: storyError } = await supabase.from("stories").upsert([story]);
  if (storyError) throw storyError;

  console.log("Upserting all 14 pages into story_pages...");
  for (const p of pages) {
    const { error: pageError } = await supabase
      .from("story_pages")
      .upsert([p], { onConflict: "story_id,page_number" });
    if (pageError) {
      console.error(`Error on page ${p.page_number}:`, pageError);
    } else {
      console.log(`Page ${p.page_number} saved.`);
    }
  }

  console.log("Done! All 14 parts successfully seeded into Supabase!");
}

seed().catch(console.error);
