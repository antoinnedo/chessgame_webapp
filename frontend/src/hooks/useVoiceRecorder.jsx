import { useState, useRef } from 'react';

export const useVoiceRecorder = () => {
  // --- State ---
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);

  // --- Refs ---
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // --- Audio Analysis Refs ---
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);

  // --- VAD (Voice Activity Detection) Flags ---
  const hasSpeechStartedRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const recordingStartTimeRef = useRef(0);

  // --- Configuration ---
  const NOISE_THRESHOLD = 25;     // Volume level to trigger recording
  const SILENCE_THRESHOLD = 15;   // Volume level to trigger silence detection
  const SILENCE_DURATION = 1000;  // Duration of silence before stopping
  const MIN_RECORDING_TIME = 250; // Minimum valid recording duration (ms)

  const getSupportedMimeType = () => {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/aac'];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  // --- Internal: MediaRecorder Control ---
  const triggerRecordingStart = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') return;

    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = getSupportedMimeType();
    const options = mimeType ? { mimeType } : undefined;

    try {
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const duration = Date.now() - recordingStartTimeRef.current;

        // Only save blob if recording was long enough
        if (duration > MIN_RECORDING_TIME && chunksRef.current.length > 0) {
          const finalType = mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: finalType });
          setAudioBlob(blob);
          console.log(`Phrase captured (${duration}ms). Blob size: ${blob.size}`);
        } else {
          console.log(`Audio too short (${duration}ms), discarded.`);
        }
        setIsRecording(false);
      };

      // Request data slices every 200ms to ensure short phrases are captured
      recorder.start(200);

      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      console.log("Recording Started (Auto)");

    } catch (err) {
      console.error("Recorder failed to start", err);
    }
  };

  const triggerRecordingStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log("Recording Stopped (Auto)");
    }
  };

  // --- Internal: Volume Analysis Loop ---
  const startVolumeAnalysis = async (stream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();

    // Ensure context is running (prevents 'suspended' state bugs)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    source.connect(analyser);
    analyser.fftSize = 2048;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    hasSpeechStartedRef.current = false;

    const loop = () => {
      if (!streamRef.current) return;

      analyser.getByteTimeDomainData(dataArray);

      // Calculate RMS (Root Mean Square) for volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const a = dataArray[i] - 128;
        sum += a * a;
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Logic: Trigger Start on Noise
      if (rms > NOISE_THRESHOLD) {
        if (!hasSpeechStartedRef.current) {
          hasSpeechStartedRef.current = true;
          triggerRecordingStart();
        }
        // Reset silence timer while noise is present
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }

      // Logic: Trigger Stop on Silence
      else if (rms < SILENCE_THRESHOLD) {
        if (hasSpeechStartedRef.current) {
          // Start silence countdown
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              triggerRecordingStop();
              hasSpeechStartedRef.current = false;
              silenceTimerRef.current = null;
            }, SILENCE_DURATION);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return { audioContext, analyser };
  };

  // --- Public: Start Monitoring ---
  const startMonitoring = async () => {
    try {
      if (streamRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const tools = await startVolumeAnalysis(stream);
      audioContextRef.current = tools.audioContext;

      setIsMonitoring(true);
      console.log("'Always Listening' Mode Enabled");
    } catch (err) {
      console.error("Mic permission denied", err);
      alert("Please allow microphone access.");
    }
  };

  // --- Public: Stop Monitoring ---
  const stopMonitoring = () => {
    // Clear animations and timers
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Stop active recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Stop tracks and clear stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(e => console.error("Context close err", e));
      audioContextRef.current = null;
    }

    // Reset state
    setIsMonitoring(false);
    setIsRecording(false);
    hasSpeechStartedRef.current = false;

    console.log("Monitoring Disabled (Clean Stop)");
  };

  return {
    isMonitoring,
    isRecording,
    startMonitoring,
    stopMonitoring,
    audioBlob,
    setAudioBlob
  };
};
