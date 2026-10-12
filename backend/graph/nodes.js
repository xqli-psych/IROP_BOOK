import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../config/llm.js";

export const evaluateMst = async (state) => {
  const mstSchema = z.object({
    reasoning: z
      .string()
      .describe(
        "1. Identify the feeling, thought, or intention the reader mentioned in response to the question. 2. Explain WHY the character feels or thinks that way according to the reader."
      ),
    hasMst: z
      .boolean()
      .describe(
        "True if the reader mentions any feelings, thoughts, intentions, or reasons related to the character's mind. False if they only state physical actions or read the book text word-for-word."
      ),
  });

  const structuredLlm = llm.withStructuredOutput(mstSchema, { name: "evaluate_mst" });

  const systemPrompt = `You are an expert developmental psychology coder analyzing reading transcripts for Mental State Talk (MST).

### What counts as MST (True):
- Feelings & Emotions: scared, afraid, happy, sad, angry, mad, proud, worried, excited, nervous, brave, careful (when explaining fear/caution).
- Cognitive States & Thoughts: think, know, remember, forget, wonder, believe, pretend, understand, hiding so someone won't see.
- Desires & Intentions: want, wish, hope, try to, need, like/love.
- Explaining *why* a character feels or thinks a certain way (e.g., "Because the alligator might bite him").

### What DOES NOT count as MST (False):
- Reading the story page text verbatim without adding commentary.
- Describing purely physical actions or appearances with no reason or emotion (e.g., "He put a board down", "He is on the bed").

### Accuracy Rule:
Compare <reader_transcript> against <story_text> and <question_asked>. Set hasMst to true if the reader is explaining the character's feelings, thoughts, or motives.`;

  const prompt = `Analyze the elderly reader's transcript based on the current story page.

<story_text>
${state.storyPageText || ""}
</story_text>

<question_asked>
${state.questionText || "General discussion about the page."}
</question_asked>

<reader_transcript>
${state.transcript || ""}
</reader_transcript>`;

  const result = await structuredLlm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(prompt),
  ]);

  return {
    mstDetected: result.hasMst,
    mstAnalysis: result.reasoning,
  };
};

export const generateResponse = async (state) => {
  const instruction = state.mstDetected
    ? `The reader just talked about a character's feelings or thoughts!
       - DO NOT repeat the reader's exact words back to them.
       - React to the feeling they mentioned using 2 tiny, simple 5-year-old sentences (5 to 8 words per sentence!).
       - Connect the feeling to something simple on the page or in the picture (like his big wood board, his worried face, or hiding under the bed).`
    : `The reader only described a physical action and missed the character's feelings!
       - React in 1 tiny sentence (under 7 words).
       - Ask 1 super short question about how the boy feels right now (like "Do you think he feels scared?" or "Why does he look worried?").`;

  const systemPrompt = `You are Alice, a sweet 5-year-old kid listening to an older adult read a picture book to you.

### STRICT 5-YEAR-OLD GRAMMAR & LENGTH RULES:
- Talk in TINY, simple sentences! Maximum 5 to 8 words per sentence.
- Total response MUST be under 18 words total (1 to 2 short sentences).
- NEVER use adult grammar like "Not knowing if...", "While he...", "It must be...", or long run-on sentences.
- Only use words a 5-year-old actually says: "so spooky", "uh-oh", "yikes", "super brave", "big", "hiding", "worried", "mad", "happy".
- Compare BAD vs GOOD examples:
  - BAD (too long and adult): "Yikes, not knowing if a big chompy alligator is hiding down there is super spooky! I bet his heart is beating super fast while he tiptoes around his room!"
  - GOOD (real 5-year-old): "[dramatic gasp] Ooh, that is so spooky! Look at his face, he looks super worried!"
  - GOOD (real 5-year-old): "[whisper] Uh-oh, he has to be so brave! That big board will keep his toes safe!"
  - GOOD (real 5-year-old): "[giggling] Hehehe! He is tricking that sneaky alligator! I bet he feels so smart!"

### Story & Accuracy Rules:
- Acknowledge the emotion the reader mentioned without parroting their exact words.
- ONLY talk about what is in <current_story_page>, <what_reader_just_said>, or visibly drawn in the page image. Do not spoil future pages.

### Orpheus Voice Tags:
- Start your response with ONE bracketed vocal tag: [giggling], [dramatic gasp], [excited], [whisper], or [curious].
- Do not use asterisks (*giggles*) or quotation marks.`;

  const textPrompt = `Here is the current page, the question we are talking about, and what the reader just said to you:

<current_story_page>
${state.storyPageText || ""}
</current_story_page>

<question_asked_to_reader>
${state.questionText || "Talking about the current page."}
</question_asked_to_reader>

<what_reader_just_said>
${state.transcript || ""}
</what_reader_just_said>

<emotional_meaning>
${state.mstAnalysis || ""}
</emotional_meaning>

<your_task>
${instruction}
</your_task>`;

  const humanContent = state.pageImageUrl
    ? [
        { type: "text", text: textPrompt },
        { type: "image_url", image_url: { url: state.pageImageUrl } },
      ]
    : textPrompt;

  const result = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage({ content: humanContent }),
  ]);

  const cleanResponse = typeof result.content === "string" 
    ? result.content.trim() 
    : String(result.content);

  return { response: cleanResponse };
};

export const updateSummary = async (state) => {
  const systemPrompt = `You are a factual session logger tracking an intergenerational story-reading session.
Rules:
- Keep the summary under 3 sentences.
- Record ONLY factual plot points discussed and the specific feelings/thoughts the reader and child talked about.
- Ignore bracketed audio tags like [giggling] or [dramatic gasp].
- Do not invent or assume details not present in the exchange.`;

  const prompt = `Update the summary with the latest exchange.

<previous_summary>
${state.conversationSummary || "None."}
</previous_summary>

<latest_exchange>
Elderly Reader: "${state.transcript || ""}"
Child AI: "${state.response || ""}"
</latest_exchange>`;

  const result = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(prompt),
  ]);

  const cleanSummary = typeof result.content === "string" 
    ? result.content.trim() 
    : String(result.content);

  return { conversationSummary: cleanSummary };
};