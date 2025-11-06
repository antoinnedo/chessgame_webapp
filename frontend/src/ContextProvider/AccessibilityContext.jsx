import { createContext, useCallback, useEffect, useMemo, useState } from "react";

const AccessibilityContext = createContext({
  isAccessibleMode: false,
  toggleAccessibleMode: () => {},
  setAccessibleMode: () => {},
});

function AccessibilityContextProvider({ children }) {
  const [isAccessibleMode, setAccessibleModeState] = useState(false);

  useEffect(() => {
    const storedPreference = window.localStorage.getItem("accessibleMode");
    if (storedPreference !== null) {
      setAccessibleModeState(storedPreference === "true");
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

  const value = useMemo(
    () => ({
      isAccessibleMode,
      setAccessibleMode,
      toggleAccessibleMode,
    }),
    [isAccessibleMode, setAccessibleMode, toggleAccessibleMode]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export { AccessibilityContext, AccessibilityContextProvider };
