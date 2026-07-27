import Groq from "groq-sdk";
import fs from "fs";
import { config } from "../config/env.js";

const groq = new Groq({ apiKey: config.GROQ_API_KEY });

export async function transcribeAudio(filePath) {
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "whisper-large-v3-turbo",
  });
  
  return transcription.text;
}