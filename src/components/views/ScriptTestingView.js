import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../data/translations';
import { showToast } from '../../utils';
import './ScriptTestingView.css';

const ScriptTestingView = ({ onBack }) => {
  const {
    currentLang,
    extractedLines,
    scriptLines,
    currentLineIndex,
    setCurrentLineIndex,
    getCurrentLineData
  } = useAppContext();

  const [currentData, setCurrentData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [waitingForUserLine, setWaitingForUserLine] = useState(false);
  const [testComplete, setTestComplete] = useState(false);
  const [otherCharacterLines, setOtherCharacterLines] = useState([]);
  const [currentOtherLineIndex, setCurrentOtherLineIndex] = useState(0);
  const [userCharacter, setUserCharacter] = useState('');
  const [showUserLine, setShowUserLine] = useState(false);

  // Reference to the testing view container
  const testingViewRef = useRef(null);

  // Update the current line data
  const updateCurrentLineData = useCallback(() => {
    const data = getCurrentLineData();
    setCurrentData(data);

    if (data) {
      // Calculate progress based on current line index
      const progressPercent = Math.round(
        (currentLineIndex / (extractedLines.length - 1)) * 100
      );
      setProgress(progressPercent);

      // Set the user's character name
      if (data.current && data.current.speaker) {
        setUserCharacter(data.current.speaker);
      }
    }
  }, [getCurrentLineData, extractedLines, currentLineIndex]);

  // Initialize the testing view
  useEffect(() => {
    updateCurrentLineData();
    prepareScriptForTesting();
  }, [updateCurrentLineData]);

  // Prepare the script for testing by organizing lines by character
  const prepareScriptForTesting = useCallback(() => {
    if (!extractedLines.length || !scriptLines.length) return;

    // Get the user's character from the first extracted line
    const userChar = extractedLines[0].speaker;
    setUserCharacter(userChar);

    // Find all lines between the user's first and last line
    const firstUserLineIndex = extractedLines[0].index;
    const lastUserLineIndex = extractedLines[extractedLines.length - 1].index;

    // Get all script lines between first and last user line
    const relevantScriptLines = scriptLines.slice(firstUserLineIndex, lastUserLineIndex + 1);

    // Parse the script lines to get structured data
    const parsedLines = [];

    relevantScriptLines.forEach(line => {
      if (!line.trim()) return; // Skip empty lines

      // Use regex to extract speaker and dialogue
      const match = line.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
      if (match) {
        const speaker = match[1].trim();
        const dialogue = match[2].trim();

        // Only include lines from other characters
        if (speaker !== userChar) {
          parsedLines.push({ speaker, line: dialogue });
        }
      }
    });

    setOtherCharacterLines(parsedLines);
  }, [extractedLines, scriptLines]);

  // Handle when the user indicates they've said their line
  const handleSaidMyLine = () => {
    // Show the user's line briefly for confirmation
    setShowUserLine(true);

    // After a short delay, move to the next line
    setTimeout(() => {
      setShowUserLine(false);

      // If this is the last user line, mark the test as complete
      if (currentLineIndex >= extractedLines.length - 1) {
        setTestComplete(true);
      } else {
        // Move to the next user line
        moveToNextUserLine();
      }
    }, 2000); // Show the line for 2 seconds
  };

  // Handle when the user needs help with their line
  const handleNeedHelp = () => {
    setShowUserLine(true);
  };

  // Handle when the user is ready to hide their line and continue
  const handleHideLine = () => {
    setShowUserLine(false);
  };

  // Move to the next line in the script
  const moveToNextUserLine = () => {
    // Move to the next user line
    setCurrentLineIndex(currentLineIndex + 1);
    updateCurrentLineData();
    setWaitingForUserLine(true);
  };

  // Handle restart button click
  const handleRestart = () => {
    setCurrentLineIndex(0);
    setCurrentOtherLineIndex(0);
    setWaitingForUserLine(false);
    setTestComplete(false);
    updateCurrentLineData();
  };

  // Handle back button click
  const handleBack = () => {
    onBack();
  };

  const t = translations[currentLang];

  // If no data is available, show an error
  if (!currentData) {
    return (
      <div className="script-testing-view">
        <h1>{t.testingMode || 'Script Testing Mode'}</h1>
        <p>{t.errorNoLines || 'No lines available for testing.'}</p>
        <div className="center">
          <button onClick={onBack}>{t.backButton || 'Back'}</button>
        </div>
      </div>
    );
  }

  // If test is complete
  if (testComplete) {
    return (
      <div className="script-testing-view">
        <h1>{t.testingMode || 'Script Testing Mode'}</h1>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '100%' }}></div>
        </div>
        <div className="complete-message">
          <h2>{t.complete || 'Complete!'}</h2>
          <p>{t.testCompleteMessage || 'You have completed testing all your lines!'}</p>
          <p className="complete-stats">
            {t.completedLines || 'Lines completed'}: {extractedLines.length}
          </p>
        </div>
        <div className="center">
          <button onClick={handleRestart} className="primary-btn">
            {t.restartButton || 'Restart'}
          </button>
          <button onClick={handleBack} className="secondary-btn">
            {t.backButton || 'Back'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="script-testing-view" ref={testingViewRef}>
      <h1>{t.testingMode || 'Script Testing Mode'}</h1>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="testing-container">
        {/* Other character's lines */}
        <div className="other-character-lines">
          {currentData.context.map((line, index) => (
            <div key={index} className="other-line">
              <strong>{line.speaker}:</strong> {line.line}
            </div>
          ))}
        </div>

        {/* User's line (hidden by default) */}
        <div className="user-line-container">
          {showUserLine ? (
            <div className="user-line">
              <strong>{currentData.current.speaker}:</strong> {currentData.current.line}
              <button className="hide-line-btn" onClick={handleHideLine}>
                {t.hideLineButton || 'Hide Line'}
              </button>
            </div>
          ) : (
            <div className="user-prompt">
              <p>{(t.yourTurnPrompt && t.yourTurnPrompt.replace('{character}', userCharacter)) || `It's your turn, ${userCharacter}!`}</p>
              <div className="user-actions">
                <button className="said-line-btn" onClick={handleSaidMyLine}>
                  {t.saidMyLineButton || 'I Said My Line'}
                </button>
                <button className="need-help-btn" onClick={handleNeedHelp}>
                  {t.needHelpButton || 'Need Help?'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="center">
        <button onClick={handleBack} className="secondary-btn">
          {t.backButton || 'Back'}
        </button>
      </div>
    </div>
  );
};

export default ScriptTestingView;
