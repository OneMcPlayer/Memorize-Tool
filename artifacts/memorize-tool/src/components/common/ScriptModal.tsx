import React, { useState } from 'react';
import './ScriptModal.css';
import { translations } from '../../data/translations';
import ScriptReader from './ScriptReader';
import './ScriptReader.css';

interface ParsedLine {
  speaker?: string;
  dialogue?: string;
  isDirection?: boolean;
  text?: string;
}

interface ScriptLine {
  speaker: string;
  line: string;
}

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: string;
  title?: string;
  lang: string;
  isExperimentalMode?: boolean;
}

const ScriptModal = ({ isOpen, onClose, script, title, lang, isExperimentalMode = false }: ScriptModalProps) => {
  const [showScriptReader, setShowScriptReader] = useState(false);

  if (!isOpen) return null;

  const t = translations[lang] as Record<string, string>;

  const formatScript = (scriptText: string): React.ReactNode[] => {
    if (!scriptText) return [];

    const processedLines: ParsedLine[] = [];
    const rawLines = scriptText.split('\n');

    rawLines.forEach(line => {
      if (!line.trim()) return;

      const characterMatches = line.match(/([A-Z][A-Z\s.']+):\s*([^:]+?)(?=\s+[A-Z][A-Z\s.']+:|$)/g);

      if (characterMatches && characterMatches.length > 0) {
        characterMatches.forEach(match => {
          const colonIndex = match.indexOf(':');
          if (colonIndex > 0) {
            const speaker = match.substring(0, colonIndex).trim();
            const dialogue = match.substring(colonIndex + 1).trim();
            processedLines.push({ speaker, dialogue });
          }
        });
      } else {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const speaker = line.substring(0, colonIndex).trim();
          const dialogue = line.substring(colonIndex + 1).trim();
          processedLines.push({ speaker, dialogue });
        } else {
          processedLines.push({ isDirection: true, text: line.trim() });
        }
      }
    });

    return processedLines.map((item, index) => {
      if (item.isDirection) {
        return (
          <div key={`direction-${index}`} className="script-direction">
            {item.text}
          </div>
        );
      } else {
        return (
          <div key={`line-${index}`} className="script-line-group">
            <div className="script-speaker-block">{item.speaker}</div>
            <div className="script-dialogue-block">
              <p className="dialogue-paragraph">{item.dialogue}</p>
            </div>
          </div>
        );
      }
    });
  };

  const parseScriptForReader = (scriptText: string): ScriptLine[] => {
    if (!scriptText) return [];

    const parsedLines: ScriptLine[] = [];
    const lines = scriptText.split('\n');

    lines.forEach(line => {
      if (!line.trim()) return;
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const speaker = line.substring(0, colonIndex).trim();
        const dialogue = line.substring(colonIndex + 1).trim();
        parsedLines.push({ speaker, line: dialogue });
      }
    });

    return parsedLines;
  };

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
              <button
                type="button"
                className="close-button"
                onClick={onClose}
                aria-label={t.closeButton || 'Close'}
              >
                ×
              </button>
            </div>
            <div className="script-modal-body">
              <div className="script-container">
                {formatScript(script)}
              </div>
            </div>
            <div className="script-modal-footer">
              {isExperimentalMode && (
                <button
                  onClick={() => setShowScriptReader(true)}
                  className="secondary-btn listen-btn"
                >
                  {t.listenButton || 'Listen to Script'}
                </button>
              )}
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
