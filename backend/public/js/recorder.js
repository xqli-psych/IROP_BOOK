export let recordedAudioBlob = null;
let mediaRecorder;
let audioChunks = [];

export async function startRecording(audioPlaybackElement, recordBtn, stopBtn) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      recordedAudioBlob = new Blob(audioChunks, { type: "audio/mp4" });
      audioChunks = []; 
      
      audioPlaybackElement.src = URL.createObjectURL(recordedAudioBlob);
      audioPlaybackElement.style.display = "block";
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    recordBtn.disabled = true;
    recordBtn.innerText = "🔴 Recording...";
    stopBtn.disabled = false;
  } catch (err) {
    console.error("Microphone error:", err);
    alert("Could not access the microphone.");
  }
}

export function stopRecording(recordBtn, stopBtn) {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    recordBtn.disabled = false;
    recordBtn.innerText = "🎤 Start Recording";
    stopBtn.disabled = true;
  }
}