import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../data/translations';
import { showToast, copyToClipboard, getPlainText } from '../../utils';
import './PracticeView.css';

interface PracticeViewProps {
  onBack: () => void;
}

const PracticeView = ({ onBack }: PracticeViewProps) => {
  const {
    currentLang,
    extractedLines,
    currentLineIndex,
    getCurrentLineData,
    nextLine,
    isCopyButtonEnabled,
  } = useAppContext();

  const [revealed, setRevealed] = useState(false);
  const [currentData, setCurrentData] = useState<ReturnType<typeof getCurrentLineData>>(null);
  const [progress, setProgress] = useState(0);
  const [readingContext, setReadingContext] = useState(true);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [copied, setCopied] = useState(false);

  const practiceViewRef = useRef<HTMLDivElement>(null);

  const updateCurrentLineData = useCallback(() => {
    const data = getCurrentLineData();
    setCurrentData(data);

    if (data) {
      const progressPercent = Math.round(
        (currentLineIndex / (extractedLines.length - 1)) * 100
      );
      setProgress(progressPercent);
    }
  }, [getCurrentLineData, extractedLines, currentLineIndex]);

  useEffect(() => {
    updateCurrentLineData();

    const checkOrientation = () => {
      setIsLandscape(window.innerHeight < 500 && window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [updateCurrentLineData]);

  const handleVerify = () => {
    setReadingContext(false);
    setRevealed(true);
  };

  const handleSkip = () => {
    if (!currentData) return;
    if (currentData.isLastLine) {
      setPracticeComplete(true);
    } else {
      nextLine();
      setRevealed(false);
      setReadingContext(true);
      updateCurrentLineData();
    }
  };

  const handleNext = () => {
    if (!currentData) return;
    if (currentData.isLastLine) {
      setPracticeComplete(true);
    } else {
      nextLine();
      setRevealed(false);
      setReadingContext(true);
      updateCurrentLineData();
    }
  };

  const handleRestart = () => {
    setPracticeComplete(false);
    onBack();
  };

  const handleCopy = () => {
    if (currentData && currentData.current) {
      copyToClipboard(getPlainText(currentData.current.line))
        .then(() => {
          showToast((translations[currentLang] as Record<string, string>).copied);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
    }
  };

  const t = translations[currentLang] as Record<string, string>;

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

  const contextSection = (
    currentData.context.length > 0 ? (
      <div className="context-section">
        <h3>{t.context}</h3>
        {currentData.context.map((line, index) => (
          <div key={index} className="context-line">
            {line.speaker ? `${line.speaker}: ${line.line}` : String(line.line || '')}
          </div>
        ))}
      </div>
    ) : (
      <div className="context-section empty-context">
        <p>{t.noContext || 'No preceding context available.'}</p>
      </div>
    )
  );

  const actionButtons = (
    <div className={`${isLandscape ? '' : 'center '}action-buttons`}>
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
  );

  const cardSection = (
    <div id="card" className={revealed ? 'revealed' : ''}>
      {revealed ? (
        <div className="card-inner">
          <div className="card-content">
            <strong>{currentData.current.speaker}:</strong> {currentData.current.line}
          </div>
          {isCopyButtonEnabled && (
            <button
              className={`copy-btn${copied ? ' copy-btn--copied' : ''}`}
              onClick={handleCopy}
              aria-label="Copy to clipboard"
            >
              {copied ? '✓' : '📋'}
            </button>
          )}
        </div>
      ) : (
        <div className="card-content">
          <p className="your-line-prompt">{t.yourLinePrompt || 'Your line:'}</p>
        </div>
      )}
    </div>
  );

  const nextButtonSection = (
    <div className="center">
      <button id="nextButton" onClick={handleNext} className="primary-btn">
        {currentData.isLastLine ? t.restartButton : t.nextButton}
      </button>
    </div>
  );

  return (
    <div className="practice-view" ref={practiceViewRef}>
      <h1>{t.practiceMode}</h1>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      {readingContext ? (
        isLandscape ? (
          <div className="landscape-container">
            {contextSection}
            {actionButtons}
          </div>
        ) : (
          <>
            {contextSection}
            {actionButtons}
          </>
        )
      ) : (
        isLandscape ? (
          <div className="landscape-container">
            {cardSection}
            {nextButtonSection}
          </div>
        ) : (
          <>
            {cardSection}
            {nextButtonSection}
          </>
        )
      )}

      {!(currentData.isLastLine && !readingContext) && (
        <div className="center">
          <button onClick={handleRestart} className="secondary-btn restart-btn">
            {t.restartButton}
          </button>
        </div>
      )}
    </div>
  );
};

export default PracticeView;
