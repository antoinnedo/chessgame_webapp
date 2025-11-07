export default class SpeechToText{
  constructor(onTranscriptUpdate, onEnd, onStart){
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

    this.autoRestart = false;

    this.engine.onstart = () => {
      this.isListening = true;
      if (onStart) onStart();
    };

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

      if (this.autoRestart) {
        try {
          this.engine.start();
        } catch (e) {
          console.error("Error restarting speech recognition:", e);
        }
      }
    };

    this.engine.onerror = (e) => {
      console.error("Speech-to-text error:", e.error);

      if (e.error === 'network' || e.error === 'service-not-allowed' || e.error === 'not-allowed') {
        this.autoRestart = false; 
      }
    };
  } 

  startListening() {
    if (!this.supported) return;
    this.autoRestart = true;
    if (!this.isListening) {
      this.isListening = true;
      this.transcript = "";
      this.engine.start();
    }
  }

  stopListening() {
    this.autoRestart = false;
    if (this.isListening) {
      this.engine.stop();
      this.isListening = false;
    }
  }
}