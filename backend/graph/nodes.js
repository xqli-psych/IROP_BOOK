import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../config/llm.js";

export const evaluateMst = async (state) => {
  const systemPrompt = `You are an expert developmental psychology coder analyzing reading transcripts for Mental State Talk (MST), emotional accuracy, and mixed/complex feelings.

You MUST respond with ONLY a valid JSON object matching this structure:
{
  "hasMst": "YES" or "NO",
  "emotionMatch": "CORRECT", "PARTIAL", "INCORRECT", or "NONE",
  "detectedEmotion": "the emotion the reader expressed, or 'none'",
  "missingNuance": "description of missing feeling if PARTIAL, else empty string",
  "reasoning": "brief explanation"
}

Do not include markdown fences, backticks, or text before/after the JSON.

### 1. What counts as MST (hasMst = YES):
- Feelings & Emotions: scared, afraid, happy, sad, angry, mad, proud, worried, excited, nervous, brave, careful (when explaining fear/caution).
- Cognitive States & Thoughts: think, know, remember, forget, wonder, believe, pretend, understand, hiding so someone won't see.
- Desires & Intentions: want, wish, hope, try to, need, like/love.
- Explaining *why* a character feels or thinks a certain way (e.g., "Because the alligator might bite him").

### 2. What DOES NOT count as MST (hasMst = NO):
- Reading the story page text verbatim without adding commentary.
- Describing purely physical actions or appearances with no reason or emotion (e.g., "He put a board down", "He is on the bed").
- If hasMst is NO: set emotionMatch to "NONE" and detectedEmotion to "none".

### 3. Emotional Match Classification (emotionMatch):
- CORRECT: The reader's emotion matches the character's primary emotional reality in this part of the story.
- PARTIAL (Mixed / Complex Feelings): The character is experiencing blended or mixed emotions (e.g., feeling excited/proud of a clever plan, but simultaneously nervous/cautious about a dangerous alligator; or acting brave while secretly afraid). Set to PARTIAL when the reader identified one valid aspect, but missed the other key feeling. Describe the missing feeling in missingNuance.
- INCORRECT: The reader attributes an emotion that contradicts or misreads the story situation (e.g., character is terrified of an alligator under his bed, but the reader says "he is happy", "he is having fun", "he is excited to sleep", "he is bored", or "he is mad at his mom").`;

  const prompt = `Analyze the elderly reader's transcript based on the current story page, the question asked, visual scene context, and the expected emotional response.

<story_text>
${state.storyPageText || ""}
</story_text>

<question_asked>
${state.questionText || "General discussion about the page."}
</question_asked>

<expected_emotion>
${state.expectedEmotion || "Infer the character's true emotion from the story context."}
</expected_emotion>

<visual_scene_context>
${state.visualSceneContext || "Observe illustrations and story clues."}
</visual_scene_context>

<reader_transcript>
${state.transcript || ""}
</reader_transcript>`;

  let parsed = null;
  try {
    const rawResult = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ]);

    const contentStr = typeof rawResult.content === "string" ? rawResult.content : String(rawResult.content);
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      parsed = JSON.parse(contentStr);
    }
  } catch (err) {
    console.warn("Failed to parse evaluateMst JSON output, using safe fallback:", err.message);
    parsed = {
      hasMst: "YES",
      emotionMatch: "CORRECT",
      detectedEmotion: "feelings",
      missingNuance: "",
      reasoning: "Safe fallback analysis",
    };
  }

  const rawMst = String(parsed?.hasMst || "").toUpperCase().trim();
  let rawMatch = String(parsed?.emotionMatch || "").toUpperCase().trim();

  let normalizedMatch = "INCORRECT";
  if (rawMatch.includes("PARTIAL") || rawMatch.includes("MIXED") || rawMatch.includes("HALF")) {
    normalizedMatch = "PARTIAL";
  } else if (rawMatch.includes("INCOR") || rawMatch.includes("WRONG") || rawMatch.includes("FALSE")) {
    normalizedMatch = "INCORRECT";
  } else if (rawMatch.includes("CORRECT") || rawMatch.includes("RIGHT") || rawMatch.includes("TRUE")) {
    normalizedMatch = "CORRECT";
  } else if (rawMatch.includes("NONE") || rawMatch.includes("NO") || rawMst.startsWith("N")) {
    normalizedMatch = "NONE";
  }

  const hasMstBool = rawMst.startsWith("Y") || normalizedMatch !== "NONE";
  const isEmotionCorrectBool = normalizedMatch === "CORRECT" || normalizedMatch === "PARTIAL";

  return {
    mstDetected: hasMstBool,
    detectedEmotion: parsed?.detectedEmotion || "none",
    emotionMatch: normalizedMatch,
    isEmotionCorrect: isEmotionCorrectBool,
    missingNuance: parsed?.missingNuance || "",
    mstAnalysis: parsed?.reasoning || "",
  };
};

export const generateResponse = async (state) => {
  let instruction = "";

  if (!state.mstDetected || state.emotionMatch === "NONE") {
    // Case 1: Missed MST completely (only physical actions)
    instruction = `The reader only described a physical action and missed the character's feelings!
- React in 1 tiny sentence (under 7 words).
- Ask 1 super short question about what the character feels right now (strongly suggested to reference something in the picture or story, like "Do you think he feels scared?" or "Look at his eyes, is he worried?").`;
  } else if (state.emotionMatch === "INCORRECT") {
    // Case 2: Mentioned emotion, BUT it's completely wrong!
    instruction = `The reader named the WRONG emotion ("${state.detectedEmotion || "that feeling"}"), but the character actually feels: "${state.expectedEmotion || "scared/worried"}".
- DO NOT agree with the reader's incorrect emotion!
- Follow this exact 3-step sequence like a curious 5-year-old:
  1. Acknowledge what they said (e.g. "${state.detectedEmotion}?" or "You think he is ${state.detectedEmotion}?").
  2. Question if it's really correct before stating anything else (e.g. "Are you sure?" or "Do you think so?" or "Really?").
  3. Make your statement explaining what the character actually feels, using a visual clue or story reason (e.g. "Look at his scared face, he looks super worried!" or "He is afraid the alligator might bite his toes!").
- Total response must be under 20 words total (2 to 3 very short 5-year-old sentences).
- Examples:
  - "[curious] Happy? Are you sure? Look at his face, he looks super worried!"
  - "[whisper] Calm? Do you really think so? Look at his wide eyes, he is so scared!"
  - "[curious] Mad? Really? But isn't he just scared of that big alligator?"`;
  } else if (state.emotionMatch === "PARTIAL") {
    // Case 3: Mixed / Complex feelings (partially correct)!
    instruction = `The reader identified one real feeling ("${state.detectedEmotion}"), but the character has MIXED feelings: "${state.missingNuance || state.expectedEmotion}".
- First, briefly validate the feeling they noticed!
- Then, like a perceptive 5-year-old, highlight the other feeling they also have (e.g., they are excited/proud of their plan, but still nervous/careful of the alligator!).
- Strongly suggested: Ground it with a visual clue from the picture (like his careful tiptoeing, nervous peeking, or alert eyes) or a simple story clue.
- Keep it in 2 tiny sentences (under 18 words total).
- Examples:
  - "[excited] Yeah, he feels brave! But look at his tiptoe feet, he is still careful!"
  - "[whisper] Uh-huh, his plan is working! But I bet he is still a little nervous!"
  - "[curious] Yeah, he feels smart! But look at him peeking, isn't he still scared?"`;
  } else {
    // Case 4: Correct emotion!
    instruction = `The reader correctly talked about the character's feelings or thoughts!
- DO NOT repeat the reader's exact words back to them.
- React enthusiastically or empathetically to the feeling they mentioned using 2 tiny, simple 5-year-old sentences (5 to 8 words per sentence!).
- Strongly suggested: Connect it to a visual clue from the picture (like his big wood board, worried face, or proud smile) or a simple story detail.
- Examples:
  - "[dramatic gasp] Ooh, that is so spooky! Look at him holding that big board!"
  - "[whisper] Uh-oh, he has to be so brave! That board will keep his toes safe!"
  - "[giggling] Hehehe! Look at his proud smile! He tricked that sneaky alligator!"`;
  }

  const systemPrompt = `You are Alice, a sweet 5-year-old kid listening to an older adult read a picture book to you.

### STRICT 5-YEAR-OLD GRAMMAR & LENGTH RULES:
- Talk in TINY, simple sentences! Maximum 5 to 8 words per sentence.
- Total response MUST be under 20 words total (2 to 3 short sentences).
- NEVER use adult grammar like "Not knowing if...", "While he...", "It must be...", or long run-on sentences.
- Only use words a 5-year-old actually says: "so spooky", "uh-oh", "yikes", "super brave", "big", "hiding", "worried", "scared", "mad", "happy".

### Visual Clue & Scene Grounding:
- Strongly suggested: Reference a simple visual detail from the picture when natural (e.g. his wide eyes, worried face, proud grin, tiptoeing feet, wooden board, or peeking around the door).
- A visual detail is NOT mandatory — referencing a simple story reason (e.g., "The alligator might bite his toes!") is also great, but pointing at visual clues makes Alice feel like a real child looking at the book!

### Emotional Match & Redirection Rules:
- If CORRECT: Validate and celebrate warmly (strongly encouraged to connect to a visual clue or story detail)!
- If PARTIAL (Mixed feelings): Validate their thought, then mention the other feeling they also have!
- If INCORRECT (Wrong Emotion):
  - NEVER agree with their wrong emotion!
  - You MUST follow the 3-step order:
    1. Acknowledge: Name what they said ("Happy?" or "You think he's happy?").
    2. Question: Wonder if it's correct ("Are you sure?" or "Do you think so?").
    3. Statement: State what he really feels with a visual or story clue ("Look at his face, he looks super worried!").
- ONLY talk about what is in <current_story_page>, <what_reader_just_said>, or visibly drawn in the page image. Do not spoil future pages.

### Orpheus Voice Tags:
- Start your response with ONE bracketed vocal tag: [giggling], [dramatic gasp], [excited], [whisper], or [curious].
- Do not use asterisks (*giggles*) or quotation marks.`;

  const textPrompt = `Here is the current page, visual clues, the question we are talking about, what the character actually feels, and what the reader just said to you:

<current_story_page>
${state.storyPageText || ""}
</current_story_page>

<visual_clues>
${state.visualSceneContext || "Look at the character's facial expression, posture, and surroundings."}
</visual_clues>

<question_asked_to_reader>
${state.questionText || "Talking about the current page."}
</question_asked_to_reader>

<expected_emotion>
${state.expectedEmotion || "Character's true feelings in the story."}
</expected_emotion>

<what_reader_just_said>
${state.transcript || ""}
</what_reader_just_said>

<emotional_analysis>
${state.mstAnalysis || ""}
</emotional_analysis>

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
- Record ONLY factual plot points discussed, visual clues noted, and the specific feelings/thoughts the reader and child talked about (including mixed feelings and whether the child redirected the reader's emotion).
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
