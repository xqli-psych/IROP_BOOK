import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState } from "./state.js";
import { evaluateMst, generateResponse, updateSummary } from "./nodes.js";

export const graph = new StateGraph(GraphState)
  .addNode("evaluate_mst", evaluateMst)
  .addNode("generate_response", generateResponse)
  .addNode("update_summary", updateSummary)
  .addEdge(START, "evaluate_mst")
  .addEdge("evaluate_mst", "generate_response")
  .addEdge("generate_response", "update_summary")
  .addEdge("update_summary", END)
  .compile();