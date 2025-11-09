/**
 * Speaks a message using the browser's SpeechSynthesis API.
 * @param {string} msg - The text to be spoken.
 */
export function speak(msg) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(msg);
    utter.rate = 1.1;
    window.speechSynthesis.speak(utter);
  } else {
    console.warn("Speech synthesis is not supported in this browser.");
  }
}