import React, { useState, useRef, useEffect } from 'react';
import MicButton from './MicButton';
import SpeechToText from '../services/SpeechToText';
import ChessParser from '../services/chessParser';

export default function VoiceNavigation({ onMoveFound }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const speechRef = useRef(null);

  const parserRef = useRef(new ChessParser());

  const executeMove = (move) => {
    if (onMoveFound) {
      onMoveFound(move);
    }
    if (speechRef.current) {
      speechRef.current.stopListening();
    }
  };

  if (!speechRef.current) {
    speechRef.current = new SpeechToText(
      (text) => setTranscript(text),
      (finalText) => {
        setIsListening(false);
      }
    );
  }

  useEffect(() => {
    if (!isListening || !transcript) return;

    // Get the parser instance and call its method
    const parser = parserRef.current;
    const move = parser.parse(transcript); 
    
    if (move) {
      executeMove(move);
    }
  }, [transcript, isListening, onMoveFound]);

  const handleMicClick = () => {
    const speech = speechRef.current;
    if (!speech.supported) return;

    if (isListening) {
      speech.stopListening();
      setIsListening(false);
    } else {
      speech.startListening();
      setIsListening(true);
    }
  };

  return (
    <div className="voice-navigation-container">
      <MicButton 
        isListening={isListening} 
        onClick={handleMicClick}
      />

      {isListening && (
        <div readOnly className="live-transcript-display">
          {transcript}
        </div>
      )}
    </div>
  );
}