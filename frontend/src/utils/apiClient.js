const BASE_URL = "http://localhost:3000/api";

export const apiClient = {
  // Fetch all stories
  getStories: async () => {
    const res = await fetch(`${BASE_URL}/stories`);

    if (!res.ok) {
      throw new Error("Failed to fetch stories");
    }

    return res.json();
  },

  // NEW: Fetch the complete ordered story sequence
  getStorySequence: async (storyId) => {
    const res = await fetch(
      `${BASE_URL}/stories/${storyId}/pages`
    );

    const payload = await res.json();

    if (!res.ok) {
      throw new Error(
        payload.error || "Failed to load story sequence"
      );
    }

    return payload;
  },

  // Fetch one specific story page
  getStoryPage: async (storyId, pageNumber) => {
    const res = await fetch(
      `${BASE_URL}/stories/${storyId}/pages/${pageNumber}`
    );

    if (!res.ok) {
      throw new Error("Failed to fetch page");
    }

    return res.json();
  },

  // Login and create a session
  loginSession: async (sessionCode, participationId) => {
    const res = await fetch(`${BASE_URL}/sessions/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionCode,
        participationId
      })
    });

    if (!res.ok) {
      throw new Error("Failed to start session");
    }

    return res.json();
  },

  // Link a story to a session
  linkStory: async (sessionId, storyId) => {
    const res = await fetch(
      `${BASE_URL}/sessions/${sessionId}/story`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ storyId })
      }
    );

    if (!res.ok) {
      throw new Error("Failed to link story to session");
    }

    return res.json();
  },

  // Update reading progress
  updateProgress: async (sessionId, pageNumber) => {
    const res = await fetch(
      `${BASE_URL}/sessions/${sessionId}/progress`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ pageNumber })
      }
    );

    if (!res.ok) {
      throw new Error("Failed to update progress");
    }

    return res.json();
  },

  // Send audio or text to the AI pipeline
  analyzeReading: async (formData) => {
    const res = await fetch(`${BASE_URL}/analyze-reading`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      throw new Error("Failed to analyze reading");
    }

    return res.json();
  }
};
