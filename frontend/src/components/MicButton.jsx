import React from 'react';
import { Fab } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import HearingIcon from '@mui/icons-material/Hearing'; // New icon for "Monitoring"

export default function MicButton({ isMonitoring, isRecording, onClick }) {
  let color = "primary"; //Blue
  let icon = <MicOffIcon fontSize="medium"  />;
  let className = "";

  if (isRecording) {
    // STATE: Hearing Voice (Recording)
    color = "error"; // Red
    icon = <MicIcon fontSize="medium" />;
    className = "animate-pulse shadow-lg shadow-red-400/50";
  } else if (isMonitoring) {
    // STATE: Waiting for Voice (Monitoring)
    color = "success"; // Green
    icon = <HearingIcon fontSize="medium"  />;
    className = "shadow-lg shadow-green-400/50";
  }

  return (
    <Fab
      size="medium"
      onClick={onClick}
      color={color}
      aria-label={isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
      sx={{
        zIndex: 10,
        transition: 'all 0.3s ease'
      }}
      className={className}
    >
      {icon}
    </Fab>
  );
}
