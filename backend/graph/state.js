import { Annotation } from "@langchain/langgraph";

export const GraphState = Annotation.Root({
  storyPageText: Annotation,      
  conversationSummary: Annotation, 
  transcript: Annotation,          
  mstDetected: Annotation,        
  mstAnalysis: Annotation,         
  response: Annotation,         
});