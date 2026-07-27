import { startRecording, stopRecording, recordedAudioBlob } from "./recorder.js";

// DOM Elements
const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const audioPlayback = document.getElementById("audioPlayback");
const readingForm = document.getElementById("readingForm");
const submitBtn = document.getElementById("submitBtn");

// Event Listeners
recordBtn.addEventListener("click", () => startRecording(audioPlayback, recordBtn, stopBtn));
stopBtn.addEventListener("click", () => stopRecording(recordBtn, stopBtn));

readingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const audioFileInput = document.getElementById("audioFile").files[0];
  if (!recordedAudioBlob && !audioFileInput) {
    alert("Please either record your voice or upload an audio file first.");
    return;
  }

  submitBtn.innerText = "Processing...";
  submitBtn.disabled = true;

  const formData = new FormData();
  formData.append("storyPageText", document.getElementById("storyText").value);
  formData.append("conversationSummary", document.getElementById("summaryText").value);

  if (recordedAudioBlob) {
    formData.append("audioFile", recordedAudioBlob, "recording.webm");
  } else {
    formData.append("audioFile", audioFileInput);
  }

  try {
    // Because the frontend and backend are now hosted together, we can use a relative URL
    const response = await fetch("/api/analyze-reading", {
      method: "POST",
      body: formData, 
    });

    const result = await response.json();

    if (result.success) {
      document.getElementById("responseArea").style.display = "block";
      document.getElementById("childResponseText").innerText = result.childResponse;
      document.getElementById("transcriptText").innerText = `"${result.transcript}"`;

      if (result.audioBase64) {
        const audio = new Audio("data:audio/wav;base64," + result.audioBase64);
        audio.play();
      }

    } else {
      alert("Error: " + result.error);
    }
  } catch (error) {
    console.error("Network error:", error);
    alert("Failed to connect to the server.");
  } finally {
    submitBtn.innerText = "Analyze Reading";
    submitBtn.disabled = false;
  }
});