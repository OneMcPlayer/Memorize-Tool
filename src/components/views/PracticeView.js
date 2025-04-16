import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../data/translations';
import { showToast, copyToClipboard, getPlainText } from '../../utils';
import { tts, stt, textComparison, sessionTracker } from '../../services/SpeechService';
import SessionReportView from './SessionReportView';
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

  // Speech recognition states
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechResult, setSpeechResult] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Refs
  const microphoneRef = useRef(null);
  const speakerRef = useRef(null);

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
      console.log(`Progress: ${progressPercent}% (Line ${currentLineIndex + 1} of ${extractedLines.length})`);
      setProgress(progressPercent);
    }
  }, [getCurrentLineData, extractedLines, currentLineIndex]);

  // Initialize the practice view
  useEffect(() => {
    updateCurrentLineData();

    // Initialize session tracker
    sessionTracker.startSession();

    return () => {
      // Clean up speech services when component unmounts
      tts.stop();
      stt.stop();
    };
  }, [updateCurrentLineData]);

  // Handle reveal button click
  const handleReveal = () => {
    setRevealed(true);

    // If we have a speech result, record it in the session tracker
    if (speechResult) {
      sessionTracker.recordAttempt(
        currentLineIndex,
        getPlainText(currentData.current.line),
        transcript,
        speechResult.similarity
      );
    }
  };

  // Play context lines using text-to-speech
  const playContextLines = async () => {
    if (!currentData || !currentData.context || currentData.context.length === 0) {
      showToast(t.noContextToPlay || 'No context to play');
      return;
    }

    setIsSpeaking(true);

    try {
      // Play each context line sequentially
      for (const line of currentData.context) {
        const text = line.speaker ? `${line.speaker}: ${getPlainText(line.line)}` : getPlainText(line);
        await tts.speak(text);
      }
    } catch (error) {
      console.error('TTS error:', error);
      showToast(t.ttsError || 'Error playing audio');
    } finally {
      setIsSpeaking(false);
    }
  };

  // Handle verify button click (after reading context)
  const handleVerify = () => {
    setReadingContext(false);
    setTranscript('');
    setSpeechResult(null);
  };

  // Start speech recognition
  const startListening = async () => {
    if (!stt.checkSupport()) {
      showToast(t.sttNotSupported || 'Speech recognition not supported in this browser');
      return;
    }

    setIsListening(true);
    setTranscript('');
    setSpeechResult(null);

    try {
      const result = await stt.start();
      setTranscript(result.transcript);

      // Compare with the expected line
      if (currentData && currentData.current) {
        const originalText = getPlainText(currentData.current.line);
        const similarity = textComparison.getSimilarity(originalText, result.transcript);
        const feedback = textComparison.getFeedback(similarity);

        setSpeechResult({
          similarity,
          feedback
        });
      }
    } catch (error) {
      console.error('STT error:', error);
      showToast(t.sttError || 'Error recognizing speech');
    } finally {
      setIsListening(false);
    }
  };

  // Stop speech recognition
  const stopListening = () => {
    stt.stop();
    setIsListening(false);
  };

  // Handle skip button click (skip to next line without verifying)
  const handleSkip = () => {
    // Check if this is the last line before skipping
    const isLastLine = currentData.isLastLine;

    // Stop any ongoing speech or listening
    tts.stop();
    stt.stop();

    nextLine();
    setRevealed(false);
    setReadingContext(true);
    setTranscript('');
    setSpeechResult(null);
    updateCurrentLineData();

    // If it was the last line, we need to show completion message
    if (isLastLine) {
      // End the session tracking
      sessionTracker.endSession();

      // Show the session report
      setShowReport(true);
    }
  };

  // Handle next button click (after revealing line)
  const handleNext = () => {
    // Stop any ongoing speech or listening
    tts.stop();
    stt.stop();

    // Check if this is the last line
    const isLastLine = currentData.isLastLine;

    nextLine();
    setRevealed(false);
    setReadingContext(true);
    setTranscript('');
    setSpeechResult(null);
    updateCurrentLineData();

    // If it was the last line, end the session and show report
    if (isLastLine) {
      sessionTracker.endSession();
      setShowReport(true);
    }
  };

  // Handle restart button click
  const handleRestart = () => {
    // Stop any ongoing speech or listening
    tts.stop();
    stt.stop();

    // End the current session if active
    sessionTracker.endSession();

    onBack();
  };

  // Close the session report and go back
  const handleCloseReport = () => {
    setShowReport(false);
    onBack();
  };

  // Start a new session
  const handleNewSession = () => {
    setShowReport(false);
    sessionTracker.startSession();
    setCurrentData(null);
    setRevealed(false);
    setReadingContext(true);
    setTranscript('');
    setSpeechResult(null);
    updateCurrentLineData();
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

  // If showing the session report
  if (showReport) {
    return (
      <div className="practice-view">
        <h1>{t.practiceMode}</h1>
        <SessionReportView
          sessionData={sessionTracker.getSummary()}
          onRestart={handleNewSession}
          onClose={handleCloseReport}
        />
      </div>
    );
  }

  // If we've reached the end of the script
  if (currentData.isLastLine && revealed) {
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
          <button onClick={() => {
            sessionTracker.endSession();
            setShowReport(true);
          }} className="primary-btn">
            {t.viewReport || 'View Report'}
          </button>
          <button onClick={handleRestart} className="secondary-btn">
            {t.restartButton}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="practice-view">
      <h1>{t.practiceMode}</h1>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      {readingContext ? (
        // Context reading mode
        <>
          {currentData.context.length > 0 ? (
            <div className="context-section">
              <h3>{t.context}</h3>
              <div className="context-controls">
                <button
                  ref={speakerRef}
                  onClick={playContextLines}
                  disabled={isSpeaking}
                  className="icon-btn play-btn"
                  aria-label={t.playContext || 'Play context'}
                >
                  {isSpeaking ? '🔊' : '🔈'}
                </button>
              </div>
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
      ) : (
        // Line verification mode
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
                <p className="character-name">{currentData.current.speaker}</p>

                {/* Speech recognition section */}
                <div className="speech-section">
                  <button
                    ref={microphoneRef}
                    onClick={isListening ? stopListening : startListening}
                    className={`mic-btn ${isListening ? 'listening' : ''}`}
                    aria-label={isListening ? t.stopListening || 'Stop listening' : t.startListening || 'Start listening'}
                  >
                    {isListening ? '🎤 ' + (t.listening || 'Listening...') : '🎤 ' + (t.speak || 'Speak')}
                  </button>

                  {transcript && (
                    <div className="transcript-box">
                      <p className="transcript-text">{transcript}</p>
                      {speechResult && (
                        <div className={`feedback-indicator ${speechResult.feedback.result}`}>
                          {speechResult.feedback.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="press-reveal">{t.pressReveal}</p>
              </div>
            )}
          </div>

          <div className="center">
            {!revealed ? (
              <button id="revealButton" onClick={handleReveal} className="primary-btn">
                {t.revealButton}
              </button>
            ) : (
              <button id="nextButton" onClick={handleNext} className="primary-btn">
                {currentData.isLastLine ? t.restartButton : t.nextButton}
              </button>
            )}
          </div>
        </>
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
