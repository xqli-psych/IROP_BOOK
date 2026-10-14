import { Annotation } from "@langchain/langgraph";

export const GraphState = Annotation.Root({
  storyPageText: Annotation,      
  questionText: Annotation,
  pageImageUrl: Annotation,
  conversationSummary: Annotation, 
  transcript: Annotation,          
  mstDetected: Annotation,        
  mstAnalysis: Annotation,         
  response: Annotation,         
});