import { getStories, getStoryPage } from "../services/dbService.js";
import { generateAndStoreQuestionsForStory, createStoryWithAiQuestions } from "../services/aiQuestionService.js";
import { generateSpeech } from "../services/ttsService.js";

// In-memory cache for avatar comments so audio is generated once per page and instant thereafter
const commentAudioCache = new Map();

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

    // Synthesize speech for Alice's pre-question avatar comment
    let commentAudioBase64 = null;
    if (page.avatar_comment) {
      if (commentAudioCache.has(page.id)) {
        commentAudioBase64 = commentAudioCache.get(page.id);
      } else {
        try {
          commentAudioBase64 = await generateSpeech(page.avatar_comment);
          commentAudioCache.set(page.id, commentAudioBase64);
        } catch (audioErr) {
          console.warn(`Could not synthesize comment audio for page ${pageNumber}:`, audioErr.message);
        }
      }
    }
    
    res.json({ 
      success: true, 
      data: {
        ...page,
        commentAudioBase64,
      } 
    });
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({ error: "Failed to fetch page content." });
  }
};

/**
 * Generate (or regenerate) and store questions for an existing story.
 * The questions are persisted to story_pages, ensuring they remain the same
 * across all subsequent reading sessions.
 */
export const generateStoryQuestions = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { forceRegenerate } = req.body || {};

    const result = await generateAndStoreQuestionsForStory(storyId, Boolean(forceRegenerate));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error generating questions for story:", error);
    res.status(500).json({ error: error.message || "Failed to generate story questions." });
  }
};

/**
 * Add a brand new book with pages, automatically using AI to generate
 * and persist dialogic MST questions, expected responses, and avatar comments.
 */
export const addStoryWithAiQuestions = async (req, res) => {
  try {
    const { title, author, genre, estimatedTime, pages } = req.body;
    if (!title || !pages || pages.length === 0) {
      return res.status(400).json({ error: "Story title and an array of pages are required." });
    }

    const result = await createStoryWithAiQuestions({
      title,
      author,
      genre,
      estimatedTime,
      pages,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error adding story with AI questions:", error);
    res.status(500).json({ error: error.message || "Failed to add story with questions." });
  }
};
