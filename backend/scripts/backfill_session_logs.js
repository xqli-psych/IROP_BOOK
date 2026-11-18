import "../config/env.js";
import { supabase } from "../config/supabase.js";
import { PERMANENT_PAGE_FOLLOW_UPS } from "../controllers/readingController.js";

async function backfill() {
  console.log("Fetching story pages...");
  const { data: pages } = await supabase.from("story_pages").select("*");

  console.log("Fetching session_logs with null question_text...");
  const { data: rows, error: fetchErr } = await supabase
    .from("session_logs")
    .select("id, story_page_text, child_response, mst_analysis")
    .is("question_text", null);

  if (fetchErr) throw fetchErr;
  console.log(`Found ${rows.length} rows to backfill.`);

  let updatedCount = 0;
  for (const row of rows) {
    const text = (row.story_page_text || "").toLowerCase().trim();
    const page = pages.find(
      (p) =>
        text.includes(p.page_text.toLowerCase().slice(0, 20)) ||
        p.page_text.toLowerCase().includes(text.slice(0, 20))
    );

    if (!page) continue;

    const childResp = (row.child_response || "").toLowerCase();
    const mstAnalysis = (row.mst_analysis || "").toLowerCase();

    let emotionMatch = "CORRECT";
    if (
      childResp.includes("are you sure") ||
      childResp.includes("really?") ||
      mstAnalysis.includes("wrong") ||
      mstAnalysis.includes("incorrect")
    ) {
      emotionMatch = "INCORRECT";
    } else if (
      childResp.includes("but look") ||
      childResp.includes("partially") ||
      mstAnalysis.includes("partial") ||
      mstAnalysis.includes("mixed")
    ) {
      emotionMatch = "PARTIAL";
    }

    const followUp =
      emotionMatch !== "CORRECT"
        ? page.follow_up_prompt || PERMANENT_PAGE_FOLLOW_UPS[page.page_number] || null
        : null;

    const { error: updateErr } = await supabase
      .from("session_logs")
      .update({
        question_text: page.mst_prompt || "How do you think the character feels?",
        emotion_match: emotionMatch,
        follow_up_question: followUp,
      })
      .eq("id", row.id);

    if (!updateErr) updatedCount++;
  }

  console.log(`Successfully backfilled ${updatedCount} rows!`);
}

backfill().catch(console.error);
