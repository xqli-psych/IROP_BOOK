// src/utils/apiClient.js

const BASE_URL = 'http://localhost:3000/api';

export const apiClient = {
  // 1. Fetch all stories
  getStories: async () => {
    const res = await fetch(`${BASE_URL}/stories`);
    if (!res.ok) throw new Error("Failed to fetch stories");
    return res.json();
  },

  // 2. Fetch specific page content
  getStoryPage: async (storyId, pageNumber) => {
    const res = await fetch(`${BASE_URL}/stories/${storyId}/pages/${pageNumber}`);
    if (!res.ok) throw new Error("Failed to fetch page");
    return res.json();
  },

  // 3. Login and generate a session
  loginSession: async (sessionCode, participationId) => {
    const res = await fetch(`${BASE_URL}/sessions/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionCode, participationId }),
    });
    if (!res.ok) throw new Error("Failed to start session");
    return res.json();
  },
  linkStory: async (sessionId, storyId) => {
    const res = await fetch(`${BASE_URL}/sessions/${sessionId}/story`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId }),
    });
    if (!res.ok) throw new Error("Failed to link story to session");
    return res.json();
  },

  // 4. Update session progress
  updateProgress: async (sessionId, pageNumber) => {
    const res = await fetch(`${BASE_URL}/sessions/${sessionId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageNumber }),
    });
    if (!res.ok) throw new Error("Failed to update progress");
    return res.json();
  },

  // 5. Send Audio/Text to LangGraph pipeline
  analyzeReading: async (formData) => {
    // Note: Do not set "Content-Type" manually when sending FormData via fetch.
    // The browser automatically sets the correct multipart/form-data boundary.
    const res = await fetch(`${BASE_URL}/analyze-reading`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to analyze reading");
    return res.json();
  }
};