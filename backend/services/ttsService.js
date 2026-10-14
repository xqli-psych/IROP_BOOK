import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SUPPORTS_BRACKET_TAGS = true;

export async function generateSpeech(text) {
  let promptText = text.trim();

  if (SUPPORTS_BRACKET_TAGS) {
    if (!/\[.*?\]/.test(promptText)) {
      promptText = `[cheerful] ${promptText}`;
    }
  } else {
    promptText = promptText.replace(/\[.*?\]\s*/g, "");
  }

  const response = await groq.audio.speech.create({
    model: "canopylabs/orpheus-v1-english",
    voice: "hannah",
    input: promptText,
    response_format: "wav",
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString("base64");
}