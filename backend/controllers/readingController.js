import fs from "fs/promises"; // Change to fs/promises for async unlinking
import path from "path";
import { transcribeAudio } from "../services/transcript.js";
import { saveSessionLog, getLatestSummary } from "../services/dbService.js"; 
import { graph } from "../graph/workflow.js";
import { supabase } from "../config/supabase.js"; 
import { generateSpeech } from "../services/ttsService.js";

export const analyzeReading = async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    // Extract new relational IDs from the frontend request
    const {
      storyPageText,
      sessionId,
      pageId,
      questionText,
      expectedEmotion,
      expectedResponse,
      visualSceneContext,
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
         
    const initialState = {
      storyPageText: storyPageText || pageData?.page_text || pageData?.content || pageData?.text || "No context provided.",
      questionText: activeQuestion,
      expectedEmotion: activeExpectedEmotion,
      visualSceneContext: activeVisualScene,
      pageImageUrl: pageImageUrl,
      conversationSummary: previousSummary,
      transcript: transcript,
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

    // Save log using the new relational parameters
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
      audioBase64: audioBase64
    });

  } catch (error) {
    console.error("Error during execution:", error);
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