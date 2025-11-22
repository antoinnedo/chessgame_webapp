export const transcribeAudio = async (audioBlob) => {
  const formData = new FormData();

  const mimeMap = {
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/mp4': 'mp4',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/aac': 'aac',
    'audio/mpeg': 'mp3'
  };

  // Determine extension based on the blob's type
  // If the specific type isn't in map, fallback to checking strings
  let extension = mimeMap[audioBlob.type];

  if (!extension) {
    if (audioBlob.type.includes('mp4')) extension = 'mp4';
    else if (audioBlob.type.includes('wav')) extension = 'wav';
    else if (audioBlob.type.includes('ogg')) extension = 'ogg';
    else extension = 'webm'; // Default fallback
  }

  const fileName = `recording.${extension}`;
  console.log(`Uploading ${fileName} (MIME: ${audioBlob.type})`);

  formData.append('audio', audioBlob, fileName);

  try {
    const response = await fetch('http://localhost:4800/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Transcription API Error:", error);
    return null;
  }
};
