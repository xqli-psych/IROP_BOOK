import { supabase } from "../config/supabase.js";

// Fetch all available stories
export async function getStories() {
  const { data, error } = await supabase
    .from("stories")
    .select("id, title, author, genre, estimated_time, total_parts");

  if (error) throw error;
  return data;
}

// Fetch a specific page for a story
export async function getStoryPage(storyId, pageNumber) {
  const { data, error } = await supabase
    .from("story_pages")
    .select("*")
    .eq("story_id", storyId)
    .eq("page_number", pageNumber)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data; // Returns null if page doesn't exist
}

// Create a new session for this login. Always inserts a fresh row so
// repeat logins with the same session_code don't overwrite prior
// progress/history (sessions.session_code is no longer unique).
export async function createOrGetSession(sessionCode, participationId) {
  const { data: newSession, error: insertError } = await supabase
    .from("sessions")
    .insert([{ session_code: sessionCode, participation_id: participationId }])
    .select()
    .single();

  if (insertError) throw insertError;
  return newSession;
}

// Update the current page of a session
export async function updateSessionProgress(sessionId, pageNumber) {
  const { error } = await supabase
    .from("sessions")
    .update({ current_page_number: pageNumber, updated_at: new Date() })
    .eq("id", sessionId);

  if (error) throw error;
}

// Fetch the latest summary for a specific session
export async function getLatestSummary(sessionId) {
  const { data, error } = await supabase
    .from("session_logs")
    .select("conversation_summary")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching summary:", error);
    return "Just started reading chapter 1.";
  }

  return data ? data.conversation_summary : "Just started reading chapter 1.";
}

// Save the reading log with relational IDs
export async function saveSessionLog(graphResult, sessionId, pageId) {
  // Denormalize participation_id from the session so every log row / CSV
  // export carries it without a join.
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("participation_id")
    .eq("id", sessionId)
    .single();

  if (sessionError) throw sessionError;

  const insertPayload = {
    session_id: sessionId,
    page_id: pageId,
    participation_id: session?.participation_id ?? null,
    story_page_text: graphResult.storyPageText,
    transcript: graphResult.transcript,
    mst_detected: graphResult.mstDetected,
    mst_analysis: graphResult.mstAnalysis,
    child_response: graphResult.response,
    conversation_summary: graphResult.conversationSummary,
  };

  // DIAGNOSTIC LOG: Check the terminal to see if any of these are 'undefined'
  //console.log("Supabase Insert Payload:", insertPayload);

  const { data, error } = await supabase
    .from("session_logs")
    .insert([insertPayload]);

  if (error) {
    console.error("Error saving to Supabase:", error);
    throw error;
  }
  return data;
}

export async function updateSessionStory(sessionId, storyId) {
  const { error } = await supabase
    .from("sessions")
    .update({ story_id: storyId, updated_at: new Date() })
    .eq("id", sessionId);

  if (error) throw error;
}