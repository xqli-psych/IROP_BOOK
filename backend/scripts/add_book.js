import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import "../config/env.js";
import { createStoryWithAiQuestions, generateAndStoreQuestionsForStory } from "../services/aiQuestionService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  1. Add a new book from a JSON file:
     node scripts/add_book.js path/to/book.json

  2. Generate questions for an existing story by ID:
     node scripts/add_book.js --story-id <STORY_UUID> [--force]

Example JSON format:
{
  "title": "Where the Wild Things Are",
  "author": "Maurice Sendak",
  "genre": "Children",
  "estimatedTime": "10 mins",
  "pages": [
    {
      "page_number": 1,
      "page_text": "The night Max wore his wolf suit and made mischief of one kind and another...",
      "left_image_url": "/images/wild-things-1.png",
      "right_image_url": "/images/wild-things-2.png"
    }
  ]
}
`);
    process.exit(0);
  }

  if (args[0] === "--story-id") {
    const storyId = args[1];
    const force = args.includes("--force");
    if (!storyId) {
      console.error("Error: Please provide a story ID.");
      process.exit(1);
    }

    console.log(`Generating AI questions for story ${storyId} (force: ${force})...`);
    const result = await generateAndStoreQuestionsForStory(storyId, force);
    console.log(`Successfully generated and saved questions for ${result.totalPages} pages in Supabase!`);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  const jsonFilePath = path.resolve(process.cwd(), args[0]);
  console.log(`Reading book data from: ${jsonFilePath}...`);

  const fileData = await fs.readFile(jsonFilePath, "utf-8");
  const bookData = JSON.parse(fileData);

  console.log(`Adding new book "${bookData.title}" and generating AI questions for ${bookData.pages?.length || 0} pages...`);
  const result = await createStoryWithAiQuestions(bookData);

  console.log(`Successfully added "${result.story.title}" to Supabase!`);
  console.log(`Story ID: ${result.story.id}`);
  console.log(`Total Pages Generated: ${result.pages.length}`);
  console.log("All questions are permanently saved in Supabase and will be identical for every reader.");
}

main().catch((err) => {
  console.error("Error in add_book script:", err);
  process.exit(1);
});
