import fs from "fs";
import { transcribeAudio } from "../services/transcript.js";
import { saveSessionLog, getLatestSummary } from "../services/dbService.js"; 
import { graph } from "../graph/workflow.js";
import { supabase } from "../config/supabase.js"; 
import { generateSpeech } from "../services/ttsService.js";

export const analyzeReading = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded." });
    }

    const { storyPageText } = req.body;
    const previousSummary = await getLatestSummary();
    
    const transcript = await transcribeAudio(req.file.path);
    
    const initialState = {
      storyPageText: storyPageText || "The thief crept into the baker's shop...",
      conversationSummary: previousSummary,
      transcript: transcript,
    };

    const graphResult = await graph.invoke(initialState);
    await saveSessionLog(graphResult);

    console.log("Generating Orpheus Audio...");
    const audioBase64 = await generateSpeech(graphResult.response);

    // Clean up
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      transcript: transcript,
      mstDetected: graphResult.mstDetected,
      childResponse: graphResult.response,
      audioBase64: audioBase64
    });

  } catch (error) {
    console.error("Error during execution:", error);
    if (req.file && req.file.path) fs.unlinkSync(req.file.path);
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