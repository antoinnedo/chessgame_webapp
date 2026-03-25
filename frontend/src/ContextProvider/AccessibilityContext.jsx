import { createContext, useCallback, useEffect, useMemo, useState } from "react";

const AccessibilityContext = createContext({
  isAccessibleMode: false,
  hasAnsweredPrompt: true, 
  setAccessibleMode: () => {},
  toggleAccessibleMode: () => {},
  dismissPrompt: () => {},
});

function AccessibilityContextProvider({ children }) {
  const [isAccessibleMode, setAccessibleModeState] = useState(false);
  const [hasAnsweredPrompt, setHasAnsweredPrompt] = useState(true);

  useEffect(() => {
    const storedPreference = window.localStorage.getItem("accessibleMode");
    const prompted = window.localStorage.getItem("hasAnsweredPrompt");

    // Check if they've ever answered the startup dialog
    if (prompted === "true") {
      setHasAnsweredPrompt(true);
      if (storedPreference !== null) {
        setAccessibleModeState(storedPreference === "true");
      }
    } else {
      setHasAnsweredPrompt(false);
    }
  }, []);

  const setAccessibleMode = useCallback((nextValue) => {
    setAccessibleModeState(nextValue);
    window.localStorage.setItem("accessibleMode", String(nextValue));
  }, []);

  const toggleAccessibleMode = useCallback(() => {
    setAccessibleModeState((prev) => {
      const nextValue = !prev;
      window.localStorage.setItem("accessibleMode", String(nextValue));
      return nextValue;
    });
  }, []);

  // New function to handle the dialog answer
  const dismissPrompt = useCallback((turnOn) => {
    setHasAnsweredPrompt(true);
    window.localStorage.setItem("hasAnsweredPrompt", "true");
    setAccessibleMode(turnOn);
  }, [setAccessibleMode]);

  const value = useMemo(
    () => ({
      isAccessibleMode,
      hasAnsweredPrompt,
      setAccessibleMode,
      toggleAccessibleMode,
      dismissPrompt,
    }),
    [isAccessibleMode, hasAnsweredPrompt, setAccessibleMode, toggleAccessibleMode, dismissPrompt]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export { AccessibilityContext, AccessibilityContextProvider };