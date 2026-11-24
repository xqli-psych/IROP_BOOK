import "../config/env.js";
import { supabase } from "../config/supabase.js";
import { OPEN_PAGE_PROMPTS, BOOK_MST_FOLLOW_UPS } from "../controllers/readingController.js";

async function updatePrompts() {
  console.log("Updating story_pages with open prompts and book MST follow-up questions...");
  const { data: pages, error } = await supabase.from("story_pages").select("id, page_number");
  if (error) throw error;

  for (const page of pages) {
    const pageNum = page.page_number;
    const openPrompt = OPEN_PAGE_PROMPTS[pageNum];
    const followUp = BOOK_MST_FOLLOW_UPS[pageNum];

    if (!openPrompt) continue;

    const { error: updateErr } = await supabase
      .from("story_pages")
      .update({
        mst_prompt: openPrompt,
        follow_up_prompt: followUp,
      })
      .eq("id", page.id);

    if (updateErr) {
      console.error(`Error updating page ${pageNum}:`, updateErr.message);
    } else {
      console.log(`Updated page ${pageNum} -> Prompt: "${openPrompt}" | Follow-up: "${followUp}"`);
    }
  }

  console.log("Finished updating story_pages!");
}

updatePrompts().catch(console.error);
