import React, { useContext, useEffect } from 'react';
import { AccessibilityContext } from '../ContextProvider/AccessibilityContext';
import { speak } from '../services/TextToSpeech';

export default function AccessibilityPrompt() {
  const { hasAnsweredPrompt, dismissPrompt } = useContext(AccessibilityContext);

  useEffect(() => {
    // Attempt to read the prompt out loud if the browser allows it
    if (!hasAnsweredPrompt) {
      speak("Accessibility is off. Select yes to switch it on, no to keep it off.");
    }
  }, [hasAnsweredPrompt]);

  if (hasAnsweredPrompt) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#fff', color: '#000', padding: '30px',
        borderRadius: '10px', textAlign: 'center', maxWidth: '400px'
      }}>
        <h2>Accessibility Setup</h2>
        <p style={{ margin: '20px 0' }}>
          Accessibility is off. Select <strong>Yes</strong> to switch it on, or <strong>No</strong> to keep it off.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <button
            onClick={() => {
              dismissPrompt(true);
              speak("Accessibility on, voice over move will be activated.");
            }}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
          >
            Yes
          </button>
          <button
            onClick={() => dismissPrompt(false)}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}