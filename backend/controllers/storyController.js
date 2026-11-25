import {
  getStories,
  getStoryPage,
  getStorySequence
} from "../services/dbService.js";

export const listStories = async (req, res) => {
  try {
    const stories = await getStories();

    res.json({
      success: true,
      data: stories
    });
  } catch (error) {
    console.error("Error fetching stories:", error);

    res.status(500).json({
      error: "Failed to fetch stories."
    });
  }
};

export const fetchPage = async (req, res) => {
  try {
    const { storyId, pageNumber } = req.params;

    const page = await getStoryPage(
      storyId,
      parseInt(pageNumber, 10)
    );

    if (!page) {
      return res.status(404).json({
        error: "Page not found."
      });
    }

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error("Error fetching page:", error);

    res.status(500).json({
      error: "Failed to fetch page content."
    });
  }
};

// NEW: Retrieve the entire ordered story sequence
export const fetchStorySequence = async (req, res) => {
  try {
    const pages = await getStorySequence(req.params.storyId);

    res.json({
      success: true,
      data: pages
    });
  } catch (error) {
    console.error("Error fetching story sequence:", error);

    res.status(500).json({
      error: error.message || "Failed to load story sequence."
    });
  }
};
