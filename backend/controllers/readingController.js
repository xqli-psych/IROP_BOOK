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
    const { storyPageText, sessionId, pageId, questionText } = req.body;
    
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
      .from("pages")
      .select("*")
      .eq("id", pageId)
      .single();

    const activeQuestion =
      questionText ||
      pageData?.question ||
      pageData?.prompt ||
      pageData?.question_text ||
      "";

    let pageImageUrl = "";
    const rawImgPath = pageData?.image_url || pageData?.image_path || pageData?.image || "";

    if (rawImgPath.startsWith("http")) {
      pageImageUrl = rawImgPath;
    } else if (rawImgPath) {
      try {
        const fileName = path.basename(rawImgPath);
        const localImgPath = path.resolve(process.cwd(), "../frontend/public/images", fileName);
        const imgBuffer = await fs.readFile(localImgPath);
        const ext = path.extname(fileName).toLowerCase() === ".png" ? "png" : "jpeg";
        pageImageUrl = `data:image/${ext};base64,${imgBuffer.toString("base64")}`;
      } catch (e) {
        pageImageUrl = "";
      }
    }
         
    const initialState = {
      storyPageText: storyPageText || pageData?.content || pageData?.text || "No context provided.",
      questionText: activeQuestion,
      pageImageUrl: pageImageUrl,
      conversationSummary: previousSummary,
      transcript: transcript,
    };

    const graphResult = await graph.invoke(initialState);
    
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