import { supabase } from "../config/supabase.js";

export async function getLatestSummary() {
  const { data, error } = await supabase
    .from("session_logs")
    .select("conversation_summary")
    .order("created_at", { ascending: false }) // Get the newest entry first
    .limit(1)
    .single(); // We only want one row

  // If there's an error and it's NOT because the table is empty (PGRST116)
  if (error && error.code !== "PGRST116") {
    console.error("Error fetching summary:", error);
    return "Just started reading chapter 1."; // Fallback
  }

  // If data exists, return the summary. Otherwise, return the starting string.
  return data ? data.conversation_summary : "Just started reading chapter 1.";
}

export async function saveSessionLog(graphResult) {
  const { data, error } = await supabase
    .from("session_logs")
    .insert([
      {
        story_page_text: graphResult.storyPageText,
        transcript: graphResult.transcript,
        mst_detected: graphResult.mstDetected,
        mst_analysis: graphResult.mstAnalysis,
        child_response: graphResult.response,
        conversation_summary: graphResult.conversationSummary,
      },
    ]);

  if (error) {
    console.error("Error saving to Supabase:", error);
    throw error;
  }
  return data;
}