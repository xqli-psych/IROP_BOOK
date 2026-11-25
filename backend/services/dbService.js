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
  return data;
}

// NEW: Fetch the complete story in a consistent order
export async function getStorySequence(storyId) {
  const { data, error } = await supabase
    .from("story_pages")
    .select("*")
    .eq("story_id", storyId)
    .order("page_number", { ascending: true });

  if (error) throw error;

  if (!data?.length) {
    throw new Error("This story has no pages.");
  }

  const numbers = data.map((page) => Number(page.page_number));

  // Check for invalid or duplicate page numbers
  if (
    numbers.some(
      (number, i) =>
        !Number.isInteger(number) ||
        number < 1 ||
        (i > 0 && number <= numbers[i - 1])
    )
  ) {
    throw new Error("Invalid or duplicate story page numbers.");
  }

  // Check for missing pages in the sequence
  if (numbers.some((number, i) => number !== i + 1)) {
    throw new Error(
      "Story sequence has missing page numbers. Check story_pages in Supabase."
    );
  }

  // Ensure each part has the required content
  if (
    data.some(
      (page) =>
        !page.id ||
        !page.left_image_url ||
        !page.right_image_url ||
        !page.mst_prompt
    )
  ) {
    throw new Error("Story sequence contains incomplete page content.");
  }

  return data;
}

// Create a new session for this login
export async function createOrGetSession(sessionCode, participationId) {
  const { data: newSession, error: insertError } = await supabase
    .from("sessions")
    .insert([
      {
        session_code: sessionCode,
        participation_id: participationId
      }
    ])
    .select()
    .single();

  if (insertError) throw insertError;
  return newSession;
}

// Update session progress
export async function updateSessionProgress(sessionId, pageNumber) {
  const { error } = await supabase
    .from("sessions")
    .update({
      current_page_number: pageNumber,
      updated_at: new Date()
    })
    .eq("id", sessionId);

  if (error) throw error;
}

// Fetch the latest conversation summary
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

  return data
    ? data.conversation_summary
    : "Just started reading chapter 1.";
}

// Save the reading log with relational IDs
export async function saveSessionLog(graphResult, sessionId, pageId) {
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
    conversation_summary: graphResult.conversationSummary
  };

  const { data, error } = await supabase
    .from("session_logs")
    .insert([insertPayload]);

  if (error) {
    console.error("Error saving to Supabase:", error);
    throw error;
  }

  return data;
}

// Link a story to a session
export async function updateSessionStory(sessionId, storyId) {
  const { error } = await supabase
    .from("sessions")
    .update({
      story_id: storyId,
      updated_at: new Date()
    })
    .eq("id", sessionId);

  if (error) throw error;
}
