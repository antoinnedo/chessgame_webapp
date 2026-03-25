import { useContext, useEffect, useRef } from "react";
import { ChessContext } from "../ContextProvider/ChessContextProvider";
import { AccessibilityContext } from "../ContextProvider/AccessibilityContext";
import { speak } from "../services/TextToSpeech";

export const useAnnouncement = () => {
  const { liveAnnouncement, setLiveAnnouncement } = useContext(ChessContext);
  const { isAccessibleMode } = useContext(AccessibilityContext);
  
  // Use a ref to keep track of the announcement we already "know" about
  const lastProcessedRef = useRef("");

  useEffect(() => {
    // SCENARIO: Accessibility is OFF
    if (!isAccessibleMode) {
      // We update the ref so that when the user turns the mode ON, 
      // the hook thinks this move has already been "processed."
      lastProcessedRef.current = liveAnnouncement;
      return;
    }

    // SCENARIO: Accessibility is ON
    // Only speak if the announcement is NEW and not empty
    if (liveAnnouncement && liveAnnouncement !== lastProcessedRef.current) {
      speak(liveAnnouncement);
      lastProcessedRef.current = liveAnnouncement;
      
      // Clear the context state to keep the buffer clean
      setLiveAnnouncement("");
    }
  }, [liveAnnouncement, isAccessibleMode, setLiveAnnouncement]);
};