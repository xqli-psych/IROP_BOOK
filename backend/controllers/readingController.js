import fs from "fs/promises"; // Change to fs/promises for async unlinking
import { transcribeAudio } from "../services/transcript.js";
import { saveSessionLog, getLatestSummary } from "../services/dbService.js"; 
import { graph } from "../graph/workflow.js";
import { supabase } from "../config/supabase.js"; 
import { generateSpeech } from "../services/ttsService.js";

export const analyzeReading = async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    // Extract new relational IDs from the frontend request
    const { storyPageText, sessionId, pageId } = req.body;
    
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
         
    const initialState = {
      storyPageText: storyPageText || "No context provided.",
      conversationSummary: previousSummary,
      transcript: transcript,
    };

    const graphResult = await graph.invoke(initialState);
    
    // Save log using the new relational parameters
    await saveSessionLog(graphResult, sessionId, pageId);
    
    console.log("Generating Orpheus Audio...");
    const audioBase64 = await generateSpeech(graphResult.response);

    // Clean up file asynchronously to prevent blocking the event loop
    if (uploadedFilePath) {
      await fs.unlink(uploadedFilePath);
    }

    res.json({
      success: true,
      transcript: transcript,
      mstDetected: graphResult.mstDetected,
      childResponse: graphResult.response,
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