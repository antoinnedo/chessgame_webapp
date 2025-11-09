import React, { useState, useRef, useEffect, useCallback } from 'react';
import MicButton from './MicButton';
import SpeechToText from '../services/SpeechToText';
import ChessParser from '../services/ChessParser';
import { speak } from '../services/TextToSpeech'; 

export default function VoiceNavigation({ onMoveFound, isMyTurn }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const silenceTimerRef = useRef(null);
  const speechRef = useRef(null);
  const parserRef = useRef(new ChessParser());
  const SILENCE_MS = 800;
  const MIN_CONFIDENCE = 0.75;
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    console.log("Initializing SpeechToText...");
    speechRef.current = new SpeechToText(
      handleTranscript,
      () => {
        console.log("Speech ended");
        setIsListening(false);
        // Auto-restart logic handled in SpeechToText
      },
      () => {
        console.log("Speech started");
        setIsListening(true);
      }
    );
    console.log("SpeechToText ready:", speechRef.current);
    console.log("Supported:", speechRef.current.supported);
  }, []);

  const trySubmit = useCallback((raw, confidence) => {
    if (confidence < MIN_CONFIDENCE) return;

    const candidate = parserRef.current.parse(raw);
    if (!candidate) return;

    // Split candidates: with file vs without
    const piece = candidate.charAt(0).toUpperCase(); 
    const rest = candidate.slice(1).replace(/^[a-h]/, '');
    const candidates = [
      candidate,
      piece + rest 
    ];

    // Test each candidate
    for (const san of candidates) {
      try {
        window.testMove(san);
        speak(`Heard: ${san}`);
        return;
      } catch (e) {
        //
      }
    }

    speak("Move unclear — try again");
  }, []);

  const handleTranscript = useCallback((text, confidence) => {
    setTranscript(text);

    // reset silence timer on any new speech
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      trySubmit(text, confidence);
    }, SILENCE_MS);
  }, [SILENCE_MS]);

  // const executeMove = (move) => {
  //   if (onMoveFound) {
  //     onMoveFound(move);
  //   }
  //   if (speechRef.current) {
  //     speechRef.current.stopListening();
  //   }
  // };

  //Auto start/stop on turn
  useEffect(() => {
    if (!speechRef.current?.supported || !hasPermission || !isMyTurn) return;

    console.log("Auto-starting voice (your turn + permission)");
    speechRef.current.startListening();
    setIsListening(true);
    speak("Your turn. Voice active.");
  }, [isMyTurn, hasPermission]);

  // useEffect(() => {
  //   if (!isListening || !transcript) return;

  //   // Get the parser instance and call its method
  //   const parser = parserRef.current;
  //   const move = parser.parse(transcript); 
    
  //   if (move) {
  //     executeMove(move);
  //   }
  // }, [transcript, isListening, onMoveFound]);

  // const requestMicPermission = async () => {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  //     stream.getTracks().forEach(t => t.stop());
  //     console.log("Mic permission granted");
  //     return true;
  //   } catch (err) {
  //     console.error("Mic permission denied:", err);
  //     speak("Please allow microphone access.");
  //     return false;
  //   }
  // };

  useEffect(() => {
  if (!isMyTurn && isListening) {
    console.log("Not your turn → stopping voice");
    speechRef.current?.stopListening();
    setIsListening(false);
  }
}, [isMyTurn, isListening]);

  const handleMicClick = async () => {
    console.log("Mic button clicked");

    if (!isMyTurn) {
      speak("Please wait for your turn.");
      return;
    }

    if (!speechRef.current?.supported) {
      console.warn("Speech not supported");
      return;
    }

    if (isListening) {
      speechRef.current.stopListening();
      setIsListening(false);
    } else {
      // FIRST CLICK: Get permission
      if (!hasPermission) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
          console.log("Mic permission granted");
          setHasPermission(true);
        } catch (err) {
          console.error("Permission denied:", err);
          speak("Please allow microphone access.");
          return;
        }
      }

      console.log("STARTING speech");
      speechRef.current.startListening();
      setIsListening(true);
      speak("Speak your move.");
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