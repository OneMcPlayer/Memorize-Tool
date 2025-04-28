import React, { useState, useEffect } from 'react';
import openaiService from '../../services/openaiService';
import './DebugToggle.css';

/**
 * A simple toggle for debug mode
 */
const DebugToggle = () => {
  const [debugMode, setDebugMode] = useState(openaiService.isDebugMode());
  
  // Toggle debug mode
  const toggleDebugMode = () => {
    const newMode = !debugMode;
    setDebugMode(newMode);
    openaiService.setDebugMode(newMode);
  };
  
  return (
    <div className="debug-toggle">
      <label className="debug-toggle-label">
        <input
          type="checkbox"
          checked={debugMode}
          onChange={toggleDebugMode}
          className="debug-toggle-checkbox"
        />
        <span className="debug-toggle-text">Debug Mode</span>
      </label>
      {debugMode && (
        <div className="debug-info">
          <p>Debug mode is enabled. Check console for detailed logs.</p>
          <p>Server URL: {openaiService.serverBaseUrl}</p>
          <p>TTS Model: {openaiService.ttsModel}</p>
          <p>Default Voice: {openaiService.defaultVoice}</p>
        </div>
      )}
    </div>
  );
};

export default DebugToggle;
