import fs from "fs/promises"; // Change to fs/promises for async unlinking
import path from "path";
import { transcribeAudio } from "../services/transcript.js";
import { saveSessionLog, getLatestSummary } from "../services/dbService.js"; 
import { graph } from "../graph/workflow.js";
import { supabase } from "../config/supabase.js"; 
import { generateSpeech } from "../services/ttsService.js";

// Initial open prompts for each page: Phrased as a PROMPT (not a question) and strictly
// avoids prompting Mental State Talk (MST), allowing researcher to observe if the reader spontaneously uses MST.
export const OPEN_PAGE_PROMPTS = {
  1: "Tell Alice what is happening here with the boy and his bed.",
  2: "Tell Alice what the boy is doing with the wooden board.",
  3: "Tell Alice what happens when the boy looks under the bed.",
  4: "Tell Alice what happens when Mom and Dad check under the bed.",
  5: "Tell Alice about what the boy is doing in the kitchen.",
  6: "Tell Alice what the boy is setting up down the hall and in the garage.",
  7: "Tell Alice about the trail of snacks down the stairs.",
  8: "Tell Alice what happens when the alligator crawls out from under the bed.",
  9: "Tell Alice what the boy does when the alligator passes by the closet.",
  10: "Tell Alice what is happening while the alligator is eating the cookies.",
  11: "Tell Alice about what the boy is doing behind the garage door.",
  12: "Tell Alice what the boy does after the alligator enters the garage.",
  13: "Tell Alice about what might happen tomorrow morning in the garage.",
  14: "Tell Alice about the note the boy left on the garage door.",
};

// Book-specific follow-up questions: Asked by Alice as a direct question about the story
// ONLY if the reader missed MST or answered with an incorrect/partial emotion on the initial prompt.
export const BOOK_MST_FOLLOW_UPS = {
  1: "How do you think the boy feels about having an alligator under his bed?",
  2: "Why do you think the boy feels he has to be very careful?",
  3: "How do you think the boy feels when he looks under the bed and can't see the alligator?",
  4: "What do you think Mom and Dad are thinking when they look under the bed?",
  5: "What do you think the boy is hoping the alligator will do with the bait?",
  6: "Why do you think the boy wants to lure the alligator all the way out to the garage?",
  7: "What does the boy think the alligator will do when it sees the trail of food?",
  8: "How do you think the boy feels as he watches the alligator crawl out?",
  9: "Why do you think the boy wanted to hide in the hall closet?",
  10: "How is the alligator feeling right now as he eats the trail of cookies?",
  11: "What is the boy hoping for as he hides behind the garage door?",
  12: "How does the boy feel right after locking the alligator in the garage?",
  13: "What is the boy worried might happen to his dad in the morning?",
  14: "Why do you think the boy wanted to leave a note offering to help his dad?",
};

// Backwards-compatibility alias
export const PERMANENT_PAGE_FOLLOW_UPS = BOOK_MST_FOLLOW_UPS;

export const analyzeReading = async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    // Extract relational IDs and contextual parameters from the frontend request
    const {
      storyPageText,
      sessionId,
      pageId,
      questionText,
      expectedEmotion,
      expectedResponse,
      visualSceneContext,
      isFollowUp,
    } = req.body;
    
    if (!sessionId || !pageId) {
      return res.status(400).json({ error: "Missing sessionId or pageId context." });
    }

    let transcript = "";

    // Handle audio upload OR text input
    if (req.file) {
      uploadedFilePath = req.file.path;
      transcript = await transcribeAudio(uploadedFilePath);
    } else if (req.body.transcriptText) {
      transcript = req.body.transcriptText;
    } else {
      return res.status(400).json({ error: "No audio file or text input provided." });
    }

    // Fetch summary based on the specific session
    const previousSummary = await getLatestSummary(sessionId);

    const { data: pageData } = await supabase
      .from("story_pages")
      .select("*")
      .eq("id", pageId)
      .single();

    const pageNum = pageData?.page_number;
    const isFollowUpBool = isFollowUp === "true" || isFollowUp === true;

    const activeQuestion =
      questionText ||
      (isFollowUpBool
        ? (pageData?.follow_up_prompt || BOOK_MST_FOLLOW_UPS[pageNum])
        : (OPEN_PAGE_PROMPTS[pageNum] || pageData?.mst_prompt)) ||
      "";

    const activeExpectedEmotion =
      expectedEmotion ||
      expectedResponse ||
      pageData?.mst_response ||
      "";

    const activeVisualScene =
      visualSceneContext ||
      pageData?.avatar_comment ||
      "";

    // Text visual clues from avatar_comment are passed in visualSceneContext,
    // avoiding large base64 image payloads that hit Groq's 7,000 ITPM rate limit.
    const pageImageUrl = "";

    // Use permanent book follow-up question from database or curated book map
    const permanentFollowUp =
      pageData?.follow_up_prompt ||
      BOOK_MST_FOLLOW_UPS[pageNum] ||
      "How do you think the boy feels?";
         
    const initialState = {
      storyPageText: storyPageText || pageData?.page_text || pageData?.content || pageData?.text || "No context provided.",
      questionText: activeQuestion,
      expectedEmotion: activeExpectedEmotion,
      visualSceneContext: activeVisualScene,
      pageImageUrl: pageImageUrl,
      conversationSummary: previousSummary,
      transcript: transcript,
      isFollowUp: isFollowUpBool,
      permanentFollowUpQuestion: permanentFollowUp,
    };

    let graphResult = null;
    let attempts = 0;
    while (attempts < 3) {
      try {
        graphResult = await graph.invoke(initialState);
        break;
      } catch (err) {
        attempts++;
        const isRateLimit = err?.status === 429 || String(err).includes("rate_limit") || String(err).includes("429");
        if (isRateLimit && attempts < 3) {
          console.warn(`Groq rate limit encountered. Retrying in ${attempts * 4} seconds...`);
          await new Promise((r) => setTimeout(r, attempts * 4000));
        } else {
          throw err;
        }
      }
    }
    
    console.log("Generating Orpheus Audio...");
    const audioBase64 = await generateSpeech(graphResult.response);

    const displayText = graphResult.response.replace(/\[.*?\]\s*/g, "").trim();
    graphResult.response = displayText;

    // Save log using the new relational parameters and structured MST analysis
    await saveSessionLog(graphResult, sessionId, pageId);

    // Clean up file asynchronously to prevent blocking the event loop
    if (uploadedFilePath) {
      await fs.unlink(uploadedFilePath);
    }

    res.json({
      success: true,
      transcript: transcript,
      mstDetected: graphResult.mstDetected,
      isEmotionCorrect: graphResult.isEmotionCorrect,
      emotionMatch: graphResult.emotionMatch,
      detectedEmotion: graphResult.detectedEmotion,
      missingNuance: graphResult.missingNuance,
      childResponse: displayText,
      followUpQuestion: graphResult.followUpQuestion || null,
      audioBase64: audioBase64
    });

  } catch (error) {
    console.error("Error during execution:", error);
    if (error?.status === 403 || String(error).includes("403") || String(error).includes("Forbidden")) {
      console.warn("\n⚠️ GROQ REGIONAL BLOCK (403 Forbidden):");
      console.warn("Groq blocks connections originating from Hong Kong or mainland China.");
      console.warn("If you are using a VPN, please switch your location to Singapore, United States, Japan, Australia, or Europe, and try again.\n");
    }
    // Ensure cleanup happens even on error
    if (uploadedFilePath) {
        try {
            await fs.unlink(uploadedFilePath);
        } catch (unlinkErr) {
            console.error("Failed to delete temp file:", unlinkErr);
        }
    }
    res.status(500).json({ error: "Something went wrong processing the reading." });
  }
};

export const getLogs = async (req, res) => {
  const { data, error } = await supabase
    .from("session_logs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
