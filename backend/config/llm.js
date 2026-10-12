import { ChatGroq } from "@langchain/groq";
import { config } from "./env.js";

export const llm = new ChatGroq({
  model: "qwen/qwen3.8-27b",
  temperature: 0.65,
  apiKey: config.GROQ_API_KEY,
});