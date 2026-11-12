import { Annotation } from "@langchain/langgraph";

export const GraphState = Annotation.Root({
  storyPageText: Annotation,      
  questionText: Annotation,
  expectedEmotion: Annotation,
  visualSceneContext: Annotation,
  pageImageUrl: Annotation,
  conversationSummary: Annotation, 
  transcript: Annotation,          
  mstDetected: Annotation,        
  isEmotionCorrect: Annotation,
  emotionMatch: Annotation,
  detectedEmotion: Annotation,
  missingNuance: Annotation,
  mstAnalysis: Annotation,         
  response: Annotation,         
});