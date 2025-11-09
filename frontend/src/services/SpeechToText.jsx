export default class SpeechToText{  
  constructor(onTranscriptUpdate, onEnd, onStart){
    this.onEnd = onEnd;
    const JSGF = `#JSGF V1.0;
    grammar chess;
    public <piece> = pawn | knight | bishop | rook | queen | king ;
    public <file>   = a | b | c | d | e | f | g | h ;
    public <rank>   = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 ;
    public <move>   = <piece> <file> <rank> | <file> <rank> | O-O | O-O-O ;
    `;
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

    const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    if (SpeechGrammarList) {
      const grammarList = new SpeechGrammarList();
      grammarList.addFromString(JSGF, 1);
      this.engine.grammars = grammarList;
    } else {
      console.info("SpeechGrammarList not supported – continuing without grammar.");
    }

    this.isListening = false;
    this.transcript = '';

    this.autoRestart = false;

    this.engine.onstart = () => {
      this.isListening = true;
      if (onStart) onStart();
    };

    // this.engine.onresult = (event) => {
    //   const fullTranscript = Array.from(event.results)
    //     .map((result) => result[0])
    //     .map((result) => result.transcript)
    //     .join('');

    //   this.transcript = fullTranscript.trim();
    //   if (onTranscriptUpdate) onTranscriptUpdate(this.transcript);
    // };

    this.engine.onresult = (event) => {
      let final = '';
      let interim = '';
      let bestConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const r = event.results[i];
        if (r.isFinal) {
          final += r[0].transcript;
          bestConfidence = Math.max(bestConfidence, r[0].confidence);
        } else {
          interim += r[0].transcript;
        }
      }

      const full = (final + interim).trim();
      this.transcript = full;
      this.lastConfidence = bestConfidence;

      if (onTranscriptUpdate) onTranscriptUpdate(full, bestConfidence);
    };

    this.engine.onend = () => {
      this.isListening = false;
      if (this.onEnd) this.onEnd(this.transcript);

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
    console.log("startListening() called");
    console.log("this.isListening =", this.isListening);
    console.log("this.autoRestart =", this.autoRestart);
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
      if (this.onEnd) this.onEnd(this.transcript);
    }
  }
}