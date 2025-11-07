export default class SpeechToText{
  constructor(onTranscriptUpdate, onEnd){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      this.supported = false;
      return;
    }

    this.supported = true;
    this.engine = new SpeechRecognition();
    this.engine.continuous = true;
    this.engine.interimResults = true;
    this.engine.lang = 'en-US';

    this.isListening = false;
    this.transcript = '';

    this.engine.onresult = (event) => {
      const fullTranscript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('');

      this.transcript = fullTranscript.trim();
      if (onTranscriptUpdate) onTranscriptUpdate(this.transcript);
    };

    this.engine.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd(this.transcript);
    };

    this.engine.onerror = (e) => {
      console.error("Speech-to-text error:", e.error);
    };
  } 
  startListening() {
    if (!this.supported) return;
    if (!this.isListening) {
      this.isListening = true;
      this.transcript = "";
      this.engine.start();
    }
  }

  stopListening() {
    if (this.isListening) {
      this.engine.stop();
      this.isListening = false;
    }
  }
}