import fs from "fs/promises"; // Change to fs/promises for async unlinking
import path from "path";
import { transcribeAudio } from "../services/transcript.js";
import { saveSessionLog, getLatestSummary } from "../services/dbService.js"; 
import { graph } from "../graph/workflow.js";
import { supabase } from "../config/supabase.js"; 
import { generateSpeech } from "../services/ttsService.js";

// Permanent, consistent follow-up questions per page so questions remain identical across every run
export const PERMANENT_PAGE_FOLLOW_UPS = {
  1: "Did you ever have a scary shadow in your room when you were little?",
  2: "What do you do when you want to feel super safe in bed?",
  3: "Did you ever call your mom or dad when you were scared at night?",
  4: "Did you ever have to be really brave when grown-ups didn't believe you?",
  5: "What is your favorite late-night snack from the kitchen?",
  6: "Have you ever made a sneaky trap or bait to catch something?",
  7: "Did you ever leave a trail of treats for someone or a pet?",
  8: "What makes you feel brave when you are waiting for something spooky?",
  9: "Did you ever play hide and seek in a dark closet?",
  10: "Have you ever watched an animal or pet do something really funny?",
  11: "Did you ever close a door super fast so something couldn't get in?",
  12: "How do you celebrate when you solve a really tricky problem?",
  13: "Did you ever worry about something surprising happening to your family in the morning?",
  14: "Did you ever leave a funny note for your mom or dad?",
};

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

    const activeQuestion =
      questionText ||
      pageData?.mst_prompt ||
      pageData?.question ||
      pageData?.prompt ||
      pageData?.question_text ||
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
    
    const isFollowUpBool = isFollowUp === "true" || isFollowUp === true;

    // Use permanent follow-up question from database or curated permanent map
    const pageNum = pageData?.page_number;
    const permanentFollowUp =
      pageData?.follow_up_prompt ||
      PERMANENT_PAGE_FOLLOW_UPS[pageNum] ||
      "Did you ever have a scary shadow in your room when you were little?";
         
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
