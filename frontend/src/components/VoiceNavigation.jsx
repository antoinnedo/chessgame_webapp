import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { Fab, Tooltip, Fade } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MicButton from './MicButton';
import WebSpeech from '../services/WebSpeech.jsx';
import ChessParser from '../services/ChessParser';
import { useVoiceRecorder } from "../hooks/useVoiceRecorder.jsx";
import { transcribeAudio } from '../api/ChessAPI.jsx';
import { ChessContext } from '../ContextProvider/ChessContextProvider';

export default function VoiceNavigation({ onMoveFound, isMyTurn }) {
  // --- Context ---
  const { setLiveAnnouncement } = useContext(ChessContext);

  // --- State ---
  const [isNativeListening, setIsNativeListening] = useState(false);
  const [isNativeTalking, setIsNativeTalking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [useWhisper, setUseWhisper] = useState(false);

  // --- Refs ---
  const silenceTimerRef = useRef(null);
  const speechRef = useRef(null);
  const parserRef = useRef(new ChessParser());
  
  const {
    isMonitoring,
    isRecording: isWhisperRecording,
    startMonitoring,
    stopMonitoring,
    audioBlob,
    setAudioBlob,
  } = useVoiceRecorder();

  // --- Constants ---
  const SILENCE_MS = 800;
  const MIN_CONFIDENCE = 0.75;

  // --- Visibility Timer ---
  useEffect(() => {
    if (transcript) {
      setShowTranscript(true);
      const timer = setTimeout(() => setShowTranscript(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [transcript]);

  const showMonitoring = isMonitoring || isNativeListening;
  const showRecording = isWhisperRecording || isNativeTalking;

  useEffect(() => {
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
    if (!candidate || candidate.length < 2) return;

    const piece = candidate.charAt(0).toUpperCase();
    const rest = candidate.slice(1).replace(/^[a-h]/, '');
    const candidates = [candidate, piece + rest];

    for (const san of candidates) {
      try {
        if (onMoveFound) {
          onMoveFound(san);
          return;
        }
      } catch (e) { }
    }
    setLiveAnnouncement("Move unclear");
  }, [onMoveFound, setLiveAnnouncement]);

  const handleNativeTranscript = useCallback((text, confidence) => {
    setTranscript(text);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      trySubmit(text, confidence);
    }, SILENCE_MS);
  }, [SILENCE_MS, trySubmit]);

  // --- Whisper Processing ---
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
          setLiveAnnouncement("Could not understand");
        }
        setAudioBlob(null);
      };
      processAudio().catch(console.error);
    }
  }, [audioBlob, trySubmit, setAudioBlob, isMyTurn, setLiveAnnouncement]);

  // --- Native Auto-Start ---
  useEffect(() => {
    if (useWhisper) return;
    if (!speechRef.current?.supported || !hasPermission || !isMyTurn) return;

    speechRef.current.startListening();
    setIsNativeListening(true);
    setLiveAnnouncement("Voice active.");
  }, [isMyTurn, hasPermission, useWhisper, setLiveAnnouncement]);

  const handleMicClick = async () => {
    if (!isMyTurn) {
      setLiveAnnouncement("Wait for your turn.");
      return;
    }

    if (isMonitoring || isWhisperRecording) {
      stopMonitoring();
      return;
    }

    if (isNativeListening || isNativeTalking) {
      speechRef.current?.stopListening();
      setIsNativeListening(false);
      setIsNativeTalking(false);
      return;
    }

    if (useWhisper) {
      await startMonitoring();
    } else {
      if (!hasPermission) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
          setHasPermission(true);
        } catch (err) {
          setLiveAnnouncement("Permission denied");
          return;
        }
      }
      speechRef.current.startListening();
      setIsNativeListening(true);
      setLiveAnnouncement("Speak.");
    }
  };

  return (
    <>
      <div className="voice-navigation-container">
        <Tooltip title={useWhisper ? "Switch to Native" : "Switch to AI"} arrow placement="right">
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

        <Tooltip title={showRecording ? "Recording..." : showMonitoring ? "Stop Listening" : "Start Listening"} arrow placement="right">
          <div className={!isMyTurn ? "opacity-50 pointer-events-none grayscale" : ""}>
            <MicButton
              isMonitoring={showMonitoring}
              isRecording={showRecording}
              onClick={handleMicClick}
            />
          </div>
        </Tooltip>
      </div>

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