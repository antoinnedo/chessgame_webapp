// import { useState, useRef, useEffect } from 'react';
//
// export const useNativeSpeech = (onResult) => {
//   const [isListening, setIsListening] = useState(false);
//   const recognitionRef = useRef(null);
//
//   useEffect(() => {
//     // Check browser support
//     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//     if (SpeechRecognition) {
//       const recognition = new SpeechRecognition();
//       recognition.continuous = false; // Stop after one sentence
//       recognition.lang = 'en-US';
//       recognition.interimResults = false;
//
//       recognition.onresult = (event) => {
//         const text = event.results[0][0].transcript;
//         console.log("Native heard:", text);
//         onResult(text);
//         setIsListening(false); // Auto-stop after result
//       };
//
//       recognition.onerror = (event) => {
//         console.error("Native Speech Error:", event.error);
//         setIsListening(false);
//       };
//
//       recognition.onend = () => {
//         setIsListening(false);
//       };
//
//       recognitionRef.current = recognition;
//     }
//   }, [onResult]);
//
//   const startNative = () => {
//     if (recognitionRef.current && !isListening) {
//       try {
//         recognitionRef.current.start();
//         setIsListening(true);
//       } catch (e) {
//         console.error(e);
//       }
//     } else if (!recognitionRef.current) {
//       alert("Web Speech API not supported in this browser. Use Whisper mode.");
//     }
//   };
//
//   const stopNative = () => {
//     if (recognitionRef.current && isListening) {
//       recognitionRef.current.stop();
//       setIsListening(false);
//     }
//   };
//
//   return { isListening, startNative, stopNative, isSupported: !!recognitionRef.current };
// };
