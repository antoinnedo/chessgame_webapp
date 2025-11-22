export default class WebSpeech {
  constructor(onTranscriptUpdate, onEnd, onStart, onSpeechStart, onSpeechEnd) {
    this.onEnd = onEnd;

    // --- 1. Define Chess Grammar (JSGF) ---
    // Helps the browser prioritize chess terms like "Knight", "Rook", "a-h", "1-8"
    const JSGF = `#JSGF V1.0;
    grammar chess;
    public <piece> = pawn | knight | bishop | rook | queen | king ;
    public <file>   = a | b | c | d | e | f | g | h ;
    public <rank>   = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 ;
    public <move>   = <piece> <file> <rank> | <file> <rank> | O-O | O-O-O ;
    `;

    // --- 2. Check Browser Support ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      this.supported = false;
      return;
    }

    // --- 3. Initialize Engine ---
    this.supported = true;
    this.engine = new SpeechRecognition();
    this.engine.continuous = true;      // Don't stop after one sentence
    this.engine.interimResults = true;  // Show results while speaking
    this.engine.lang = 'en-US';

    // --- 4. Apply Grammar ---
    const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    if (SpeechGrammarList) {
      const grammarList = new SpeechGrammarList();
      grammarList.addFromString(JSGF, 1);
      this.engine.grammars = grammarList;
    } else {
      console.info("SpeechGrammarList not supported – continuing without grammar.");
    }

    // --- 5. State Initialization ---
    this.isListening = false;
    this.transcript = '';
    this.autoRestart = false;

    // --- 6. Event Handlers ---

    // Voice Activity Detection (Triggers Red/Green visual states)
    this.engine.onspeechstart = () => {
      if (onSpeechStart) onSpeechStart();
    };

    this.engine.onspeechend = () => {
      if (onSpeechEnd) onSpeechEnd();
    };

    // Lifecycle Events
    this.engine.onstart = () => {
      this.isListening = true;
      if (onStart) onStart();
    };

    // Transcript Processing (Combines Interim + Final results)
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

      if (onTranscriptUpdate) onTranscriptUpdate(full, bestConfidence);
    };

    // Cleanup & Auto-Restart Logic
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

    // Error Handling
    this.engine.onerror = (e) => {
      // Ignore 'aborted' errors (happens when we stop manually)
      if (e.error === 'aborted') return;

      console.error("Speech-to-text error:", e.error);

      // Disable auto-restart on fatal errors
      if (e.error === 'network' || e.error === 'service-not-allowed' || e.error === 'not-allowed') {
        this.autoRestart = false;
      }
    };
  }

  // --- 7. Public Methods ---

  startListening() {
    if (!this.supported) return;

    this.autoRestart = true;

    // Prevent double-start
    if (this.isListening) {
      console.log("Already listening, ignoring start request.");
      return;
    }

    // Crash-proof start (Handles race conditions where engine is already running)
    try {
      this.engine.start();
      this.isListening = true;
    } catch (e) {
      if (e.name === 'InvalidStateError' || e.message.includes('already started')) {
        console.warn("Speech engine was already running (Race condition handled).");
        this.isListening = true;
      } else {
        console.error("Speech recognition start error:", e);
      }
    }
  }

  stopListening() {
    this.autoRestart = false; // Prevent auto-restart
    if (this.isListening) {
      this.engine.stop();
      this.isListening = false;
      if (this.onEnd) this.onEnd(this.transcript);
    }
  }
}
