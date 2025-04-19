import React, { useState } from 'react';
import './ScriptModal.css';
import { translations } from '../../data/translations';
import ScriptReader from './ScriptReader';
import './ScriptReader.css';

const ScriptModal = ({ isOpen, onClose, script, title, lang }) => {
  if (!isOpen) return null;

  const t = translations[lang];

  // Format the script for display
  const formatScript = (scriptText) => {
    if (!scriptText) return [];

    // Process the script to handle multiple characters in a single line
    const processedLines = [];

    // First, split by newlines
    // Make sure we're using the correct line separator
    const rawLines = scriptText.split('\n');

    // Process each line to extract multiple character dialogues if present
    rawLines.forEach(line => {
      if (!line.trim()) return; // Skip empty lines

      // Check if the line contains multiple character dialogues
      // This regex finds all occurrences of CHARACTER: dialogue pattern
      const characterMatches = line.match(/([A-Z][A-Z\s.']+):\s*([^:]+?)(?=\s+[A-Z][A-Z\s.']+:|$)/g);

      if (characterMatches && characterMatches.length > 0) {
        // Process each character dialogue separately
        characterMatches.forEach(match => {
          const colonIndex = match.indexOf(':');
          if (colonIndex > 0) {
            const speaker = match.substring(0, colonIndex).trim();
            const dialogue = match.substring(colonIndex + 1).trim();
            processedLines.push({ speaker, dialogue });
          }
        });
      } else {
        // Check if it's a single character line (contains a colon)
        const colonIndex = line.indexOf(':');

        if (colonIndex > 0) {
          // This is a character's line
          const speaker = line.substring(0, colonIndex).trim();
          const dialogue = line.substring(colonIndex + 1).trim();
          processedLines.push({ speaker, dialogue });
        } else {
          // This is a stage direction or other non-dialogue text
          processedLines.push({ isDirection: true, text: line.trim() });
        }
      }
    });

    // Now format the processed lines for display
    const formattedLines = [];

    processedLines.forEach((item, index) => {
      if (item.isDirection) {
        // Stage direction
        formattedLines.push(
          <div key={`direction-${index}`} className="script-direction">
            {item.text}
          </div>
        );
      } else {
        // Character dialogue
        formattedLines.push(
          <div key={`line-${index}`} className="script-line-group">
            <div className="script-speaker-block">{item.speaker}</div>
            <div className="script-dialogue-block">
              <p className="dialogue-paragraph">{item.dialogue}</p>
            </div>
          </div>
        );
      }
    });

    return formattedLines;
  };

  // Convert script text to structured format for the ScriptReader
  const parseScriptForReader = (scriptText) => {
    if (!scriptText) return [];

    const parsedLines = [];
    const lines = scriptText.split('\n');

    lines.forEach(line => {
      if (!line.trim()) return; // Skip empty lines

      const colonIndex = line.indexOf(':');

      if (colonIndex > 0) {
        // This is a character's line
        const speaker = line.substring(0, colonIndex).trim();
        const dialogue = line.substring(colonIndex + 1).trim();
        parsedLines.push({ speaker, line: dialogue });
      }
    });

    return parsedLines;
  };

  const [showScriptReader, setShowScriptReader] = useState(false);
  const parsedScript = parseScriptForReader(script);

  return (
    <div className="script-modal-overlay" onClick={onClose}>
      <div className="script-modal-content" onClick={e => e.stopPropagation()}>
        {showScriptReader ? (
          <ScriptReader
            script={parsedScript}
            onClose={() => setShowScriptReader(false)}
          />
        ) : (
          <>
            <div className="script-modal-header">
              <h2>{title || t.fullScript || 'Full Script'}</h2>
              <button className="close-button" onClick={onClose}>×</button>
            </div>
            <div className="script-modal-body">
              <div className="script-container">
                {formatScript(script)}
              </div>
            </div>
            <div className="script-modal-footer">
              <button
                onClick={() => setShowScriptReader(true)}
                className="secondary-btn listen-btn"
              >
                {t.listenButton || 'Listen to Script'}
              </button>
              <button onClick={onClose} className="primary-btn">
                {t.closeButton || 'Close'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ScriptModal;
