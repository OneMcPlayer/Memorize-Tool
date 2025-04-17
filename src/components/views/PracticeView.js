import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../data/translations';
import { showToast, copyToClipboard, getPlainText } from '../../utils';
import './PracticeView.css';

const PracticeView = ({ onBack }) => {
  const {
    currentLang,
    extractedLines,
    currentLineIndex,
    getCurrentLineData,
    nextLine
  } = useAppContext();

  const [revealed, setRevealed] = useState(false);
  const [currentData, setCurrentData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [readingContext, setReadingContext] = useState(true);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // Reference to the practice view container
  const practiceViewRef = useRef(null);

  // Update the current line data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateCurrentLineData = useCallback(() => {
    const data = getCurrentLineData();


    setCurrentData(data);

    if (data) {
      // Calculate progress based on current line index, not the line's index in the script
      const progressPercent = Math.round(
        (currentLineIndex / (extractedLines.length - 1)) * 100
      );

      setProgress(progressPercent);
    }
  }, [getCurrentLineData, extractedLines, currentLineIndex]);

  // Initialize the practice view and set up orientation detection
  useEffect(() => {
    updateCurrentLineData();

    // Function to check if we're in landscape mode
    const checkOrientation = () => {
      if (window.innerHeight < 500 && window.innerWidth > window.innerHeight) {
        setIsLandscape(true);
      } else {
        setIsLandscape(false);
      }
    };

    // Check orientation initially
    checkOrientation();

    // Add event listener for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Clean up event listeners
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [updateCurrentLineData]);



  // Handle verify button click (after reading context)
  const handleVerify = () => {
    setReadingContext(false);
    setRevealed(true); // Mostra immediatamente la battuta dell'utente
  };



  // Handle skip button click (skip to next line without verifying)
  const handleSkip = () => {
    // Check if this is the last line before skipping
    const isLastLine = currentData.isLastLine;

    if (isLastLine) {
      // If it's the last line, mark practice as complete
      setPracticeComplete(true);
    } else {
      // Otherwise, proceed to the next line
      nextLine();
      setRevealed(false);
      setReadingContext(true);
      updateCurrentLineData();
    }
  };

  // Handle next button click (after revealing line)
  const handleNext = () => {
    // Check if this is the last line before moving to next
    const isLastLine = currentData.isLastLine;

    if (isLastLine) {
      // If it's the last line, mark practice as complete
      setPracticeComplete(true);
    } else {
      // Otherwise, proceed to the next line
      nextLine();
      setRevealed(false);
      setReadingContext(true);
      updateCurrentLineData();
    }
  };

  // Handle restart button click
  const handleRestart = () => {
    setPracticeComplete(false);
    onBack();
  };

  // Handle copy to clipboard
  const handleCopy = () => {
    if (currentData && currentData.current) {
      copyToClipboard(getPlainText(currentData.current.line))
        .then(() => showToast(translations[currentLang].copied));
    }
  };

  const t = translations[currentLang];

  // If no data is available, show an error
  if (!currentData) {
    return (
      <div className="practice-view">
        <h1>{t.practiceMode}</h1>
        <p>{t.errorNoLines}</p>
        <div className="center">
          <button onClick={onBack}>{t.restartButton}</button>
        </div>
      </div>
    );
  }



  // If practice is complete (user has seen the last line and clicked Next)
  if (practiceComplete) {
    return (
      <div className="practice-view">
        <h1>{t.practiceMode}</h1>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '100%' }}></div>
        </div>
        <div className="complete-message">
          <h2>{t.complete}</h2>
          <p>{t.completeMessage || 'You have completed practicing all your lines!'}</p>
          <p className="complete-stats">
            {t.completedLines || 'Lines completed'}: {extractedLines.length}
          </p>
        </div>
        <div className="center">

          <button onClick={handleRestart} className="secondary-btn">
            {t.restartButton}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="practice-view" ref={practiceViewRef}>
      <h1>{t.practiceMode}</h1>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      {readingContext ? (
        // Context reading mode
        isLandscape ? (
          // Landscape layout with side-by-side context and buttons
          <div className="landscape-container">
            {/* Context section */}
            {currentData.context.length > 0 ? (
              <div className="context-section">
                <h3>{t.context}</h3>
                {currentData.context.map((line, index) => (
                  <div key={index} className="context-line">
                    {line.speaker ? `${line.speaker}: ${line.line}` : line}
                  </div>
                ))}
              </div>
            ) : (
              <div className="context-section empty-context">
                <p>{t.noContext || 'No preceding context available.'}</p>
              </div>
            )}

            {/* Action buttons in a column */}
            <div className="action-buttons">
              <button id="verifyButton" onClick={handleVerify} className="primary-btn">
                {t.verifyButton || 'Verify My Line'}
              </button>
              <button
                id="skipButton"
                onClick={handleSkip}
                className={`secondary-btn ${currentData.isLastLine ? 'finish-btn' : ''}`}
              >
                {currentData.isLastLine
                  ? (t.finishButton || 'Finish Practice')
                  : (t.skipButton || 'Skip to Next Line')}
                {currentData.isLastLine && <span className="checkmark">✓</span>}
              </button>
            </div>
          </div>
        ) : (
          // Portrait layout (stacked)
          <>
            {currentData.context.length > 0 ? (
              <div className="context-section">
                <h3>{t.context}</h3>
                {currentData.context.map((line, index) => (
                  <div key={index} className="context-line">
                    {line.speaker ? `${line.speaker}: ${line.line}` : line}
                  </div>
                ))}
              </div>
            ) : (
              <div className="context-section empty-context">
                <p>{t.noContext || 'No preceding context available.'}</p>
              </div>
            )}

            <div className="center action-buttons">
              <button id="verifyButton" onClick={handleVerify} className="primary-btn">
                {t.verifyButton || 'Verify My Line'}
              </button>
              <button
                id="skipButton"
                onClick={handleSkip}
                className={`secondary-btn ${currentData.isLastLine ? 'finish-btn' : ''}`}
              >
                {currentData.isLastLine
                  ? (t.finishButton || 'Finish Practice')
                  : (t.skipButton || 'Skip to Next Line')}
                {currentData.isLastLine && <span className="checkmark">✓</span>}
              </button>
            </div>
          </>
        )
      ) : (
        // Line verification mode
        isLandscape ? (
          // Landscape layout for verification mode
          <div className="landscape-container">
            <div id="card" className={revealed ? 'revealed' : ''}>
              {revealed ? (
                <>
                  <div className="card-content">
                    <strong>{currentData.current.speaker}:</strong> {currentData.current.line}
                  </div>
                  <button
                    className="copy-btn"
                    onClick={handleCopy}
                    aria-label="Copy to clipboard"
                  >
                    📋
                  </button>
                </>
              ) : (
                <div className="card-content">
                  <p className="your-line-prompt">{t.yourLinePrompt || 'Your line:'}</p>
                </div>
              )}
            </div>

            <div className="center">
              <button id="nextButton" onClick={handleNext} className="primary-btn">
                {currentData.isLastLine ? t.restartButton : t.nextButton}
              </button>
            </div>
          </div>
        ) : (
          // Portrait layout for verification mode
          <>
            <div id="card" className={revealed ? 'revealed' : ''}>
              {revealed ? (
                <>
                  <div className="card-content">
                    <strong>{currentData.current.speaker}:</strong> {currentData.current.line}
                  </div>
                  <button
                    className="copy-btn"
                    onClick={handleCopy}
                    aria-label="Copy to clipboard"
                  >
                    📋
                  </button>
                </>
              ) : (
                <div className="card-content">
                  <p className="your-line-prompt">{t.yourLinePrompt || 'Your line:'}</p>
                </div>
              )}
            </div>

            <div className="center">
              <button id="nextButton" onClick={handleNext} className="primary-btn">
                {currentData.isLastLine ? t.restartButton : t.nextButton}
              </button>
            </div>
          </>
        )
      )}

      <div className="center">
        <button onClick={handleRestart} className="secondary-btn restart-btn">
          {t.restartButton}
        </button>
      </div>
    </div>
  );
};

export default PracticeView;
