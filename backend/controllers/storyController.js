import { getStories, getStoryPage } from "../services/dbService.js";

export const listStories = async (req, res) => {
  try {
    const stories = await getStories();
    res.json({ success: true, data: stories });
  } catch (error) {
    console.error("Error fetching stories:", error);
    res.status(500).json({ error: "Failed to fetch stories." });
  }
};

export const fetchPage = async (req, res) => {
  try {
    const { storyId, pageNumber } = req.params;
    const page = await getStoryPage(storyId, parseInt(pageNumber));
    
    if (!page) {
      return res.status(404).json({ error: "Page not found." });
    }
    
    res.json({ success: true, data: page });
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({ error: "Failed to fetch page content." });
  }
};