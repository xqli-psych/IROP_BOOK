import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../config/llm.js";

export const evaluateMst = async (state) => {
  // If the user is answering a book-specific follow-up question
  if (state.isFollowUp) {
    const followUpSystemPrompt = `You are an expert developmental psychology coder evaluating an adult reader's response to an MST scaffolding question about a picture book.
The child avatar asked: "${state.questionText || "Question about the character"}"
Expected character feelings/thoughts: "${state.expectedEmotion || "Character emotion"}"

You MUST respond with ONLY a valid JSON object:
{
  "hasMst": "YES" or "NO",
  "emotionMatch": "CORRECT", "PARTIAL", "INCORRECT", or "NONE",
  "detectedEmotion": "the feeling, mental state, or desire expressed, or 'none'",
  "reasoning": "brief explanation"
}

What counts as Mental State Talk (hasMst = YES):
- Feelings/emotions: scared, afraid, worried, relieved, safe, happy, proud, nervous, calm, brave.
- Mental states/thoughts: remember, think, knew, wondered, believed, imagined, wished, understand.
- Desires/intentions: wanted, tried to, hoped, need, plan.
- Character motivations: explaining why a character feels, thinks, or behaves a certain way.`;

    const followUpPrompt = `Question asked to reader: "${state.questionText || ""}"
Expected character emotion: "${state.expectedEmotion || ""}"
Reader's response: "${state.transcript || ""}"`;

    let parsed = null;
    try {
      const rawResult = await llm.invoke([
        new SystemMessage(followUpSystemPrompt),
        new HumanMessage(followUpPrompt),
      ]);
      const contentStr = typeof rawResult.content === "string" ? rawResult.content : String(rawResult.content);
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(contentStr);
    } catch (err) {
      console.warn("Failed to parse evaluateMst follow-up JSON, using fallback:", err.message);
      parsed = {
        hasMst: "YES",
        emotionMatch: "CORRECT",
        detectedEmotion: "feelings",
        reasoning: "Reader answered book follow-up question",
      };
    }

    const hasMst = String(parsed?.hasMst || "").toUpperCase().startsWith("Y");
    const rawMatch = String(parsed?.emotionMatch || (hasMst ? "CORRECT" : "NONE")).toUpperCase();
    const isCorrect = rawMatch.includes("CORRECT") || rawMatch.includes("PARTIAL");

    return {
      mstDetected: hasMst,
      detectedEmotion: parsed?.detectedEmotion || (hasMst ? "feelings" : "none"),
      emotionMatch: rawMatch.includes("CORRECT") ? "CORRECT" : rawMatch.includes("PARTIAL") ? "PARTIAL" : hasMst ? "CORRECT" : "NONE",
      isEmotionCorrect: isCorrect,
      missingNuance: "",
      mstAnalysis: parsed?.reasoning || "Book follow-up exchange",
    };
  }

  // Standard evaluation for story page prompt
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
  // If this turn is answering Alice's book-specific follow-up question
  if (state.isFollowUp) {
    const followUpReactionPrompt = `You are Alice, a sweet 5-year-old child listening to an adult reader answer your question about the characters in the picture book.
The reader just replied to your question: "${state.questionText || "Question about the character"}".
Reader said: "${state.transcript || ""}"
Character's actual feelings/thoughts: "${state.expectedEmotion || ""}"

### Instructions:
- Respond like a real 5-year-old kid!
- React with childlike empathy, agreement, or curiosity about what they said about the character.
- Keep it to 1 or 2 tiny sentences (under 18 words total).
- Connect to a story or visual detail if appropriate.
- Start with ONE bracketed vocal tag: [excited], [giggling], [curious], [whisper], or [dramatic gasp].
- Examples:
  - "[excited] Yeah! That alligator looks super sneaky under the bed!"
  - "[whisper] Ooh, I think so too! He has to be so careful of his toes!"
  - "[giggling] Hehehe! Look at his proud smile! He tricked him so well!"`;

    const result = await llm.invoke([
      new SystemMessage(followUpReactionPrompt),
      new HumanMessage("Generate Alice's short acknowledgment."),
    ]);

    const clean = typeof result.content === "string" ? result.content.trim() : String(result.content);
    return {
      response: clean,
      followUpQuestion: null,
    };
  }

  // If the user's answer was fully CORRECT:
  if (state.emotionMatch === "CORRECT") {
    const correctSystemPrompt = `You are Alice, a sweet 5-year-old child listening to an older adult read a picture book to you.
The reader correctly identified the character's feelings or thoughts!

### STRICT COHERENCE & NATURAL SPEECH RULES:
- React with warmth, empathy, or excitement to the feeling they noticed.
- Speak in ONE natural, coherent child thought (1 short sentence, 6 to 14 words).
- All parts of your sentence must logically belong together! Never mash two unrelated phrases together (e.g. NEVER say "Look at his face! Look at that board!").
- If you mention an object (like the wooden board), explain WHY with a connecting word (e.g., "to keep his toes safe").
- DO NOT repeat the reader's exact words back to them.
- Start your response with ONE bracketed vocal tag: [excited], [dramatic gasp], [giggling], or [whisper].
- Examples:
  - "[whisper] Yeah, he looks so terrified that alligator will bite his toes!"
  - "[excited] Totally! That board is like a bridge to keep him safe!"
  - "[dramatic gasp] Oh no, he is so scared of what's hiding under there!"
  - "[giggling] Hehehe! He looks so proud that his sneaky plan worked!"`;

    const correctTextPrompt = `Story page: "${state.storyPageText || ""}"
Visual clues: "${state.visualSceneContext || ""}"
Reader said: "${state.transcript || ""}"`;

    const result = await llm.invoke([
      new SystemMessage(correctSystemPrompt),
      new HumanMessage(correctTextPrompt),
    ]);

    const clean = typeof result.content === "string" ? result.content.trim() : String(result.content);
    return {
      response: clean,
      followUpQuestion: null,
    };
  }

  // When emotionMatch is INCORRECT, PARTIAL, or NONE (no MST):
  // Generate Alice's 5-year-old redirect reaction, paired with the PERMANENT, saved follow-up question for this page.
  let redirectRules = "";
  if (state.emotionMatch === "INCORRECT") {
    redirectRules = `The reader named the WRONG emotion ("${state.detectedEmotion || "that feeling"}"), but the character actually feels: "${state.expectedEmotion || "scared/worried"}".
- DO NOT agree with the reader's incorrect emotion!
- Give a short, gentle redirect in 1 cohesive 5-year-old sentence (5 to 10 words).
- State what you think he feels (connected with 'because' or 'he looks').
- All parts of your sentence must logically belong together! Never mash unrelated phrases together.
- DO NOT end with a question mark (the follow-up question is already appended immediately after).
- Start with ONE bracketed tag: [curious], [whisper].
- Examples:
  - "[curious] Are you sure, because he looks really worried to me!"
  - "[whisper] Hmm, he doesn't look happy, he looks super scared of that alligator!"`;
  } else if (state.emotionMatch === "PARTIAL") {
    redirectRules = `The reader identified one real feeling ("${state.detectedEmotion}"), but the character has MIXED feelings: "${state.missingNuance || state.expectedEmotion}".
- Briefly validate what they noticed, but mention the other feeling in ONE smooth sentence (under 14 words).
- All parts of your sentence must logically belong together! Never mash unrelated phrases together.
- DO NOT end with a question mark (the follow-up question is already appended immediately after).
- Start with ONE bracketed tag: [excited], [whisper], [curious].
- Examples:
  - "[excited] Yeah, he has a smart plan, but he still has to be super careful!"
  - "[whisper] He's trying to act brave, but he is still worried inside!"`;
  } else {
    // NONE / Missed MST completely (reader only described a physical action)
    redirectRules = `The reader only described what is physically happening on the page and didn't mention any feelings!
- Acknowledge what they noticed in ONE short, friendly phrase (under 8 words).
- Speak in ONE clear, coherent thought where every part connects logically.
- NEVER mash unrelated phrases together (e.g. NEVER say "Look at his face! Look at that board!").
- DO NOT ask a question (the follow-up question is already appended immediately after).
- Start with ONE bracketed tag: [curious], [whisper].
- Examples:
  - "[curious] Yeah, he is holding that big wooden board!"
  - "[whisper] Uh-huh, he made a wooden bridge across the floor!"
  - "[giggling] Hehehe, yeah, he's leaving treats all down the stairs!"`;
  }

  const systemPrompt = `You are Alice, a sweet 5-year-old child listening to an adult read a picture book to you.
${redirectRules}

### STRICT COHERENCE RULES:
- Under 14 words total.
- Speak in ONE clear, coherent thought where every part connects logically.
- NEVER mash unrelated phrases together (e.g. NEVER say "Look at his face! Look at that board!").
- Do NOT end with a question mark (the follow-up question is already appended).`;

  const textPrompt = `Story page:
"${state.storyPageText || ""}"

Visual clues:
"${state.visualSceneContext || ""}"

Expected emotion:
"${state.expectedEmotion || ""}"

Reader said:
"${state.transcript || ""}"

Provide Alice's short reaction.`;

  let cleanReaction = "";
  try {
    const result = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(textPrompt),
    ]);
    cleanReaction = typeof result.content === "string" ? result.content.trim() : String(result.content).trim();
    // Strip any accidental XML tags if generated
    cleanReaction = cleanReaction.replace(/<[^>]+>/g, "").trim();
  } catch (err) {
    console.warn("Failed generating reaction with LLM:", err.message);
    cleanReaction = "[curious] Are you sure? Look at his face, he looks super worried!";
  }

  // The follow-up question is PERMANENT and SAVED for this page, ensuring 100% consistency
  const permanentFollowUp = state.permanentFollowUpQuestion ||
    "How do you think the boy feels about what is happening?";

  // Combined spoken response for Orpheus TTS so Alice speaks reaction then the question smoothly
  const fullSpokenResponse = `${cleanReaction} ${permanentFollowUp}`.trim();

  return {
    response: fullSpokenResponse,
    followUpQuestion: permanentFollowUp,
  };
};

export const updateSummary = async (state) => {
  const systemPrompt = `You are a factual session logger tracking an intergenerational story-reading session.
Rules:
- Keep the summary under 3 sentences.
- Record ONLY factual plot points discussed, visual clues noted, feelings/thoughts talked about, and any personal experiences shared by the reader.
- Ignore bracketed audio tags like [giggling] or [dramatic gasp].
- Do not invent or assume details not present in the exchange.`;

  const prompt = `Update the summary with the latest exchange.

<previous_summary>
${state.conversationSummary || "None."}
</previous_summary>

<latest_exchange>
Question: "${state.questionText || ""}"
Elderly Reader: "${state.transcript || ""}"
Child AI: "${state.response || ""}"
${state.followUpQuestion ? `Follow-up question asked: "${state.followUpQuestion}"` : ""}
</latest_exchange>`;

  let cleanSummary = state.conversationSummary || "";
  try {
    const result = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ]);

    cleanSummary = typeof result.content === "string" 
      ? result.content.trim() 
      : String(result.content);
  } catch (err) {
    console.warn("Failed updating summary, keeping previous:", err.message);
  }

  return { conversationSummary: cleanSummary };
};
