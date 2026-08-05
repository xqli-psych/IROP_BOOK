import { ChatGroq } from "@langchain/groq";
import { config } from "./env.js";

export const llm = new ChatGroq({
  model: "openai/gpt-oss-20b", 
  temperature: 0.3,
  apiKey: config.GROQ_API_KEY,
});
