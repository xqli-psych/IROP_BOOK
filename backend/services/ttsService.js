import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateSpeech(text) {
  
  const promptText = `[cheerful] [excited] ${text}`;   // Add style to the prompt [cheerful][excited][singsong]
  
  
  const response = await groq.audio.speech.create({
    model: "canopylabs/orpheus-v1-english",
    voice: "hannah",  //"hannah" or "autumn" 
    input: promptText,
    response_format: "wav"
  });

  
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString("base64");
}