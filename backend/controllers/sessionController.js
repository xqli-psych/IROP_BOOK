import { createOrGetSession, updateSessionProgress, updateSessionStory } from "../services/dbService.js";

export const loginSession = async (req, res) => {
  try {
    const { sessionCode, participationId } = req.body;

    if (!sessionCode) {
      return res.status(400).json({ error: "Missing sessionCode." });
    }

    if (!participationId) {
      return res.status(400).json({ error: "Missing participationId." });
    }

    const session = await createOrGetSession(sessionCode, participationId);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error("Error starting session:", error);
    res.status(500).json({ error: "Failed to start session." });
  }
};

export const updateProgress = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { pageNumber } = req.body;
    
    await updateSessionProgress(sessionId, parseInt(pageNumber));
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({ error: "Failed to update session progress." });
  }
};

export const linkStoryToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { storyId } = req.body;
    
    await updateSessionStory(sessionId, storyId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error linking story to session:", error);
    res.status(500).json({ error: "Failed to link story." });
  }
};