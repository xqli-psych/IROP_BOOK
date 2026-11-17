import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../config/llm.js";
import { supabase } from "../config/supabase.js";

/**
 * Generates an MST dialogic question, expected response, and avatar comment
 * for a specific story page using developmental psychology criteria.
 */
export async function generateQuestionForPage({ storyTitle, pageNumber, totalPages, pageText, visualClues }) {
  const systemPrompt = `You are an expert developmental psychologist and children's literature specialist designing dialogic reading prompts for intergenerational shared reading.

Your goal is to generate:
1. "mstPrompt": A Mental State Talk (MST) question exploring what a character is feeling, thinking, believing, or intending at this moment in the story.
   - Good examples: "How do you think the boy feels when he looks under the bed and can't see the alligator?" or "Why do you think he has to be very careful?" or "What are Mom and Dad thinking when they look under the bed?"
   - The question must focus on psychological states (emotions, thoughts, desires, beliefs, false beliefs) rather than purely physical descriptions.
   - Length: Under 18 words, clear and conversational.
2. "mstResponse": The true, expected character feeling or thought answering the question.
   - Example: "He feels nervous and wants his parents to come protect him." or "Because he is afraid the alligator might bite his toes."
   - Length: Under 16 words.
3. "avatarComment": A natural, sweet, childlike observation by 5-year-old Alice looking at the page before the question is asked.
   - Example: "Oh wow, look at his face! Why is he carrying that big wooden board into his room?"
   - Length: Under 18 words.

You MUST respond with ONLY a valid JSON object matching this structure:
{
  "mstPrompt": "question here",
  "mstResponse": "expected feeling/thought here",
  "avatarComment": "childlike observation here"
}

Do not include markdown code fences, backticks, or any text before/after the JSON.`;

  const userPrompt = `Story: "${storyTitle || "Children's Picture Book"}"
Page: ${pageNumber} of ${totalPages || "?"}
Page Text:
"${pageText || "No text provided."}"
${visualClues ? `Visual Clues: "${visualClues}"` : ""}`;

  let parsed = null;
  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    const contentStr = typeof response.content === "string" ? response.content.trim() : String(response.content).trim();
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      parsed = JSON.parse(contentStr);
    }
  } catch (err) {
    console.warn(`Failed to generate question for page ${pageNumber}, using fallback:`, err.message);
    parsed = {
      mstPrompt: `How do you think the character feels right now on page ${pageNumber}?`,
      mstResponse: "The character has strong feelings about what is happening.",
      avatarComment: "Look at what is happening on this page!",
    };
  }

  return {
    mstPrompt: parsed.mstPrompt?.trim() || `How do you think the character feels on page ${pageNumber}?`,
    mstResponse: parsed.mstResponse?.trim() || "The character feels emotional about the situation.",
    avatarComment: parsed.avatarComment?.trim() || "Look at the picture on this page!",
  };
}

/**
 * Generates and stores questions for all pages of a story in Supabase.
 * Because questions are stored in the database, they will be identical
 * every time any user reads the book.
 */
export async function generateAndStoreQuestionsForStory(storyId, forceRegenerate = false) {
  // 1. Fetch story details
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("*")
    .eq("id", storyId)
    .single();

  if (storyError || !story) {
    throw new Error(`Story not found: ${storyError?.message || storyId}`);
  }

  // 2. Fetch all pages for this story
  const { data: pages, error: pagesError } = await supabase
    .from("story_pages")
    .select("*")
    .eq("story_id", storyId)
    .order("page_number", { ascending: true });

  if (pagesError) {
    throw new Error(`Failed to fetch story pages: ${pagesError.message}`);
  }

  const updatedPages = [];

  for (const page of pages) {
    // If prompt already exists and not forcing regeneration, skip
    if (page.mst_prompt && page.mst_response && !forceRegenerate) {
      updatedPages.push({
        pageNumber: page.page_number,
        mstPrompt: page.mst_prompt,
        mstResponse: page.mst_response,
        avatarComment: page.avatar_comment,
        status: "kept_existing",
      });
      continue;
    }

    console.log(`Generating AI questions for "${story.title}" - Part ${page.page_number}...`);

    const generated = await generateQuestionForPage({
      storyTitle: story.title,
      pageNumber: page.page_number,
      totalPages: story.total_parts,
      pageText: page.page_text,
      visualClues: page.avatar_comment,
    });

    const updatePayload = {
      mst_prompt: generated.mstPrompt,
      mst_response: generated.mstResponse,
    };

    // If avatar_comment was empty or being regenerated
    if (!page.avatar_comment || forceRegenerate) {
      updatePayload.avatar_comment = generated.avatarComment;
    }

    const { error: updateError } = await supabase
      .from("story_pages")
      .update(updatePayload)
      .eq("id", page.id);

    if (updateError) {
      console.error(`Failed to update page ${page.page_number}:`, updateError);
    } else {
      updatedPages.push({
        pageNumber: page.page_number,
        mstPrompt: updatePayload.mst_prompt,
        mstResponse: updatePayload.mst_response,
        avatarComment: updatePayload.avatar_comment || page.avatar_comment,
        status: "generated_and_saved",
      });
    }

    // Brief pause between LLM calls to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  return {
    storyId,
    storyTitle: story.title,
    totalPages: pages.length,
    pages: updatedPages,
  };
}

/**
 * Creates a brand new story with pages and automatically generates
 * and persists the MST questions & expected responses.
 */
export async function createStoryWithAiQuestions({
  title,
  author,
  genre = "Children",
  estimatedTime = "10 mins",
  pages = [],
}) {
  if (!title) throw new Error("Story title is required.");
  if (!pages || pages.length === 0) throw new Error("At least one page is required.");

  // 1. Insert story into stories table
  const { data: newStory, error: storyError } = await supabase
    .from("stories")
    .insert([
      {
        title,
        author,
        genre,
        estimated_time: estimatedTime,
        total_parts: pages.length,
      },
    ])
    .select()
    .single();

  if (storyError) throw storyError;

  // 2. Prepare and insert pages with AI-generated questions
  const insertedPages = [];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const pageNumber = p.page_number || i + 1;

    console.log(`Generating AI questions for new book "${title}" - Page ${pageNumber}...`);

    let mstPrompt = p.mst_prompt;
    let mstResponse = p.mst_response;
    let avatarComment = p.avatar_comment;

    // If prompts are not pre-supplied, generate them with AI
    if (!mstPrompt || !mstResponse) {
      const generated = await generateQuestionForPage({
        storyTitle: title,
        pageNumber,
        totalPages: pages.length,
        pageText: p.page_text,
        visualClues: p.avatar_comment,
      });

      mstPrompt = mstPrompt || generated.mstPrompt;
      mstResponse = mstResponse || generated.mstResponse;
      avatarComment = avatarComment || generated.avatarComment;
    }

    const { data: savedPage, error: pageError } = await supabase
      .from("story_pages")
      .insert([
        {
          story_id: newStory.id,
          page_number: pageNumber,
          left_image_url: p.left_image_url || null,
          right_image_url: p.right_image_url || null,
          page_text: p.page_text || "",
          avatar_comment: avatarComment || null,
          mst_prompt: mstPrompt,
          mst_response: mstResponse,
        },
      ])
      .select()
      .single();

    if (pageError) throw pageError;
    insertedPages.push(savedPage);

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  return {
    story: newStory,
    pages: insertedPages,
  };
}
