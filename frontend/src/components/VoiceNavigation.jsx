import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Fab, Tooltip, Fade } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MicButton from './MicButton';
import WebSpeech from '../services/WebSpeech.jsx';
import ChessParser from '../services/ChessParser';
import { speak } from '../services/TextToSpeech';
import { useVoiceRecorder } from "../hooks/useVoiceRecorder.jsx";
import { transcribeAudio } from '../api/ChessAPI.jsx';

export default function VoiceNavigation({ onMoveFound, isMyTurn }) {
  const [isNativeListening, setIsNativeListening] = useState(false);
  const [isNativeTalking, setIsNativeTalking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);

  const silenceTimerRef = useRef(null);
  const speechRef = useRef(null);
  const parserRef = useRef(new ChessParser());
  const SILENCE_MS = 800;
  const MIN_CONFIDENCE = 0.75;
  const [hasPermission, setHasPermission] = useState(false);
  const [useWhisper, setUseWhisper] = useState(false);

  const {
    isMonitoring,
    isRecording: isWhisperRecording,
    startMonitoring,
    stopMonitoring,
    audioBlob,
    setAudioBlob,
  } = useVoiceRecorder();

  // --- VISIBILITY TIMER (1 Second) ---
  useEffect(() => {
    if (transcript) {
      setShowTranscript(true);
      const timer = setTimeout(() => setShowTranscript(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [transcript]);

  // --- STATE UNIFICATION ---
  const showMonitoring = isMonitoring || isNativeListening;
  const showRecording = isWhisperRecording || isNativeTalking;

  useEffect(() => {
    console.log("Initializing SpeechToText...");
    speechRef.current = new WebSpeech(
      handleNativeTranscript,
      () => { setIsNativeListening(false); setIsNativeTalking(false); },
      () => setIsNativeListening(true),
      () => setIsNativeTalking(true),
      () => setIsNativeTalking(false)
    );
  }, []);

  const trySubmit = useCallback((raw, confidence) => {
    if (confidence < MIN_CONFIDENCE) return;

    const candidate = parserRef.current.parse(raw);

    // Ignore empty/short garbage (e.g. "e")
    if (!candidate || candidate.length < 2) return;

    const piece = candidate.charAt(0).toUpperCase();
    const rest = candidate.slice(1).replace(/^[a-h]/, '');
    const candidates = [candidate, piece + rest];

    for (const san of candidates) {
      try {
        // FIX 1: Restore the speak() calls!
        if (onMoveFound) {
          onMoveFound(san);
          speak(`Heard: ${san}`);
          return;
        }
        if (window.testMove) {
          window.testMove(san);
          speak(`Heard: ${san}`);
          return;
        }
      } catch (e) { }
    }
    speak("Move unclear");
  }, [onMoveFound]);

  const handleNativeTranscript = useCallback((text, confidence) => {
    setTranscript(text);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      trySubmit(text, confidence);
    }, SILENCE_MS);
  }, [SILENCE_MS, trySubmit]);

  // --- WHISPER PROCESSING ---
  useEffect(() => {
    if (audioBlob) {
      if (!isMyTurn) {
        setAudioBlob(null);
        return;
      }
      const processAudio = async () => {
        const text = await transcribeAudio(audioBlob);
        if (text) {
          setTranscript(text);
          trySubmit(text, 1.0);
        } else {
          speak("Could not understand");
        }
        setAudioBlob(null);
      };
      processAudio().catch(console.error);
    }
  }, [audioBlob, trySubmit, setAudioBlob, isMyTurn]);

  // --- AUTO-STOP ---
  useEffect(() => {
    if (!isMyTurn) {
      if (isNativeListening) {
        speechRef.current?.stopListening();
        setIsNativeListening(false);
      }
    }
  }, [isMyTurn, isNativeListening]);

  // --- NATIVE AUTO-START ---
  useEffect(() => {
    if (useWhisper) return;
    if (!speechRef.current?.supported || !hasPermission || !isMyTurn) return;

    speechRef.current.startListening();
    setIsNativeListening(true);
    speak("Voice active.");
  }, [isMyTurn, hasPermission, useWhisper]);

  const handleMicClick = async () => {
    if (!isMyTurn) {
      speak("Wait for your turn.");
      return;
    }

    // --- STOP LOGIC (The Fix) ---
    // If EITHER Whisper state is active (Green OR Red), we must kill Whisper.
    if (isMonitoring || isWhisperRecording) {
      console.log("Stopping Whisper (User Click)...");
      stopMonitoring(); // This kills both monitoring and recording
      return;
    }

    // If Native is active, stop Native.
    if (isNativeListening || isNativeTalking) {
      console.log("Stopping Native (User Click)...");
      speechRef.current?.stopListening();
      setIsNativeListening(false);
      setIsNativeTalking(false);
      return;
    }

    // --- START LOGIC ---
    if (useWhisper) {
      console.log("Starting Whisper Monitoring...");
      await startMonitoring();
    } else {
      // Native Start Logic
      if (!hasPermission) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
          setHasPermission(true);
        } catch (err) {
          speak("Permission denied");
          return;
        }
      }
      speechRef.current.startListening();
      setIsNativeListening(true);
      speak("Speak.");
    }
  };

  const getWhisperTooltipText = () => useWhisper ? "Switch to Native" : "Switch to AI";
  const getMicTooltipText = () => {
    if (showRecording) return "Recording...";
    if (showMonitoring) return "Stop Listening";
    if (!isMyTurn) return "Wait for your turn";
    return "Start Listening";
  };

  return (
    <>
      {/* THE CONTROLS (Bottom Right) */}
      <div className="voice-navigation-container">
        <Tooltip title={getWhisperTooltipText()} arrow placement="right">
          <Fab
            size="medium"
            onClick={() => {
              if (isMonitoring) stopMonitoring();
              if (isNativeListening) {
                speechRef.current?.stopListening();
                setIsNativeListening(false);
              }
              setUseWhisper(!useWhisper);
            }}
            sx={{
              backgroundColor: useWhisper ? '#9c27b0' : '#f5f5f5',
              color: useWhisper ? 'white' : 'gray',
              '&:hover': { backgroundColor: useWhisper ? '#7b1fa2' : '#e0e0e0' }
            }}
          >
            <AutoAwesomeIcon fontSize="medium" />
          </Fab>
        </Tooltip>

        <Tooltip title={getMicTooltipText()} arrow placement="right">
          <div className={!isMyTurn ? "opacity-50 pointer-events-none grayscale" : ""}>
            <MicButton
              isMonitoring={showMonitoring}
              isRecording={showRecording}
              onClick={handleMicClick}
            />
          </div>
        </Tooltip>
      </div>

      {/* THE TRANSCRIPT (Fixed Center Overlay) */}
      {/* FIX 2: Simplified classes and high z-index to ensure it shows */}
      <Fade in={showTranscript} timeout={1000}>
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 1400 }}
        >
          <div className="bg-black/60 backdrop-blur-sm text-white px-8 py-4 rounded-2xl text-xl font-medium shadow-2xl border border-white/10">
            {transcript}
          </div>
        </div>
      </Fade>
    </>
  );
}
