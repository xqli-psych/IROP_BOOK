import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../config/llm.js";

export const evaluateMst = async (state) => {
  const mstSchema = z.object({
    hasMst: z.boolean().describe("True if the elderly reader mentions feelings, thoughts, beliefs, or mental states of the characters."),
    reasoning: z.string().describe("Briefly explain why MST is present or not."),
  });

  const structuredLlm = llm.withStructuredOutput(mstSchema, { name: "evaluate_mst" });

  const prompt = `Analyze the elderly reader's transcript based on the story page.
  Story Text: "${state.storyPageText}"
  Reader Transcript: "${state.transcript}"`;

  const result = await structuredLlm.invoke([
    new SystemMessage("You are an expert analyzing reading transcripts for Mental State Talk (MST)."),
    new HumanMessage(prompt)
  ]);
                 
  return { 
    mstDetected: result.hasMst, 
    mstAnalysis: result.reasoning 
  };
};

export const generateResponse = async (state) => {
  const instruction = state.mstDetected 
    ? "The reader successfully talked about feelings/thoughts! As a child, sound amazed by their insight, agree with them, and ask an eager follow-up question about what happens next."
    : "The reader only stated actions. As a curious child, ask a question that prompts them to explain the character's feelings or motives. For example, 'But why did they do that? Were they hungry or angry?'";

  const prompt = `
  Context of our reading session: ${state.conversationSummary}
  Story page we are on: ${state.storyPageText}
  What the elderly reader just said to me: "${state.transcript}"
  
  Goal: ${instruction}
  Generate a short, endearing response. Speak directly to the reader.`;

  const result = await llm.invoke([
    new SystemMessage("You are a curious, sweet 7-year-old child who loves being read stories by older adults. Speak naturally like a child—keep sentences relatively short, be curious, and use polite but enthusiastic language."),
    new HumanMessage(prompt)
  ]);

  return { response: result.content };
};

export const updateSummary = async (state) => {
  const prompt = `Update the conversation summary with the latest exchange. Keep it brief.
  
  Current Summary: ${state.conversationSummary}
  Elderly Reader said: "${state.transcript}"
  Child AI replied: "${state.response}"`;
  
  const result = await llm.invoke([
    new SystemMessage("You are an assistant that maintains concise summaries of intergenerational reading sessions."),
    new HumanMessage(prompt)
  ]);
  
  return { conversationSummary: result.content };
};