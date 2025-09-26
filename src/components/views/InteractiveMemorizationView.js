import React, { useState, useEffect, useRef, useCallback } from 'react';
import openaiService from '../../services/openaiService';
import ApiKeyInput from '../common/ApiKeyInput';
import { showToast } from '../../utils';
import useMicrophoneRecorder from '../../hooks/useMicrophoneRecorder';
import './InteractiveMemorizationView.css';

const buildSequence = (scriptLines, userCharacter) => {
  if (!Array.isArray(scriptLines)) {
    return [];
  }

  const sequence = [];
  const normalizedUser = (userCharacter || '').toUpperCase();

  scriptLines.forEach((line, index) => {
    if (!line || !line.trim()) return;

    const match = line.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
    if (!match) return;

    const speaker = match[1].trim();
    const dialogue = match[2].trim();

    sequence.push({
      speaker,
      line: dialogue,
      originalIndex: index,
      isUserLine: speaker.toUpperCase() === normalizedUser
    });
  });

  return sequence;
};

const findSequenceIndex = (sequence, entry) => {
  if (!entry) return -1;

  if (typeof entry.index === 'number') {
    return sequence.findIndex(item => item.isUserLine && item.originalIndex === entry.index);
  }

  return sequence.findIndex(
    item => item.isUserLine && item.speaker === entry.speaker && item.line === entry.line
  );
};

const calculateContextLines = (sequence, entry) => {
  const context = [];
  const position = findSequenceIndex(sequence, entry);

  if (position === -1) {
    return context;
  }

  for (let i = position - 1; i >= 0; i -= 1) {
    const item = sequence[i];
    if (item.isUserLine) break;
    context.unshift({ speaker: item.speaker, line: item.line, originalIndex: item.originalIndex });
  }

  return context;
};

const friendlyTtsError = (error) => {
  if (!error || !error.message) {
    return 'Error playing audio. Please try again.';
  }

  const message = error.message;
  if (message.includes('API key')) return 'OpenAI API key error. Please verify your key.';
  if (message.includes('Rate limit')) return 'OpenAI rate limit reached. Please wait and try again.';
  if (message.includes('network') || message.includes('fetch')) return 'Network error. Please check your connection.';
  if (message.includes('Proxy')) return 'Server connection error. Refresh the page and try again.';
  return message;
};

const friendlySttError = (error) => {
  if (!error) {
    return 'Could not transcribe your line. Please try again.';
  }
  const message = error.message || '';
  if (message.includes('timed out')) return 'Transcription request timed out. Try speaking again.';
  if (message.includes('Rate limit')) return 'OpenAI rate limit reached for speech recognition. Please wait before trying again.';
  if (message.includes('API key')) return 'OpenAI API key error. Please verify your key.';
  if (message.includes('Audio data is required')) return 'No audio captured. Make sure your microphone is enabled.';
  return message || 'Could not transcribe your line. Please try again.';
};

const normalizeLine = (value = '') => (
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
);

const calculateWordAccuracy = (expected, actual) => {
  const expectedWords = normalizeLine(expected).split(' ').filter(Boolean);
  const actualWords = normalizeLine(actual).split(' ').filter(Boolean);

  if (!expectedWords.length || !actualWords.length) {
    return 0;
  }

  const actualCounts = actualWords.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});

  let matches = 0;
  expectedWords.forEach(word => {
    if (actualCounts[word]) {
      matches += 1;
      actualCounts[word] -= 1;
    }
  });

  return matches / expectedWords.length;
};

const InteractiveMemorizationView = ({
  scriptLines,
  extractedLines,
  userCharacter,
  onBack,
  translations,
  currentLang
}) => {
  const t = translations[currentLang] || {};

  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [otherCharacterLines, setOtherCharacterLines] = useState([]);
  const [currentOtherLineIndex, setCurrentOtherLineIndex] = useState(0);
  const [waitingForUserLine, setWaitingForUserLine] = useState(false);
  const [showUserLine, setShowUserLine] = useState(false);
  const [testComplete, setTestComplete] = useState(false);
  const [results, setResults] = useState({ totalLines: 0, correctLines: 0, accuracy: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [characterVoices, setCharacterVoices] = useState({});
  const [volume, setVolume] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
  const [ttsModelKey, setTtsModelKey] = useState('hd');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentData, setCurrentData] = useState({
    current: null,
    context: [],
    isLastLine: false
  });

  const sequenceRef = useRef([]);

  const {
    isSupported: micSupported,
    hasPermission: micPermission,
    isRecording: micRecording,
    error: micRecorderError,
    requestPermission,
    startRecording,
    stopRecording,
    cancelRecording
  } = useMicrophoneRecorder();

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState(null);

  const assignVoices = useCallback((sequence) => {
    const voices = openaiService.getVoices();
    if (!voices.length) {
      setCharacterVoices({});
      return;
    }

    const characters = [];
    sequence.forEach(item => {
      if (item.isUserLine) return;
      if (!characters.includes(item.speaker)) {
        characters.push(item.speaker);
      }
    });

    const assignments = {};
    characters.forEach((character, idx) => {
      assignments[character] = voices[idx % voices.length];
    });
    setCharacterVoices(assignments);
  }, []);

  const updateLineState = useCallback((lineIndex, sequenceOverride) => {
    const sequence = sequenceOverride || sequenceRef.current;
    if (!Array.isArray(extractedLines) || extractedLines.length === 0) {
      setCurrentData({ current: null, context: [], isLastLine: true });
      setOtherCharacterLines([]);
      return [];
    }

    const currentEntry = extractedLines[lineIndex];
    if (!currentEntry) {
      setCurrentData({ current: null, context: [], isLastLine: true });
      setOtherCharacterLines([]);
      return [];
    }

    const context = calculateContextLines(sequence, currentEntry);
    setCurrentData({
      current: currentEntry,
      context,
      isLastLine: lineIndex >= extractedLines.length - 1
    });
    setOtherCharacterLines(context);
    setCurrentOtherLineIndex(0);
    return context;
  }, [extractedLines]);

  const playLines = useCallback(async (lines) => {
    if (!lines || lines.length === 0) {
      setIsPlaying(false);
      setWaitingForUserLine(true);
      setShowUserLine(false);
      return;
    }

    setIsPlaying(true);
    setWaitingForUserLine(false);
    setShowUserLine(false);
    setError(null);
    cancelRecording();

    try {
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        setCurrentOtherLineIndex(i);

        const voice = characterVoices[line.speaker] || openaiService.defaultVoice;
        const model = openaiService.getTtsModels()[ttsModelKey];

        const audioBlob = await openaiService.textToSpeech(line.line, {
          voice,
          speed,
          model
        });

        await openaiService.playAudio(audioBlob, { volume });
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      setIsPlaying(false);
      setWaitingForUserLine(true);
    } catch (err) {
      console.error('Error playing other character lines:', err);
      setIsPlaying(false);
      setWaitingForUserLine(false);
      const friendly = friendlyTtsError(err);
      setError(friendly);
      showToast(friendly, 5000, 'error');
    }
  }, [characterVoices, ttsModelKey, speed, volume, cancelRecording]);

  useEffect(() => {
    setHasApiKey(openaiService.hasApiKey());

    const savedModelKey = localStorage.getItem('openai_tts_model');
    if (savedModelKey && openaiService.getTtsModels()[savedModelKey]) {
      setTtsModelKey(savedModelKey);
    }
  }, []);

  useEffect(() => {
    const initialise = async () => {
      try {
        if (!scriptLines || scriptLines.length === 0 || !extractedLines || extractedLines.length === 0) {
          setError('Missing script data. Please go back and prepare your lines again.');
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        const sequence = buildSequence(scriptLines, userCharacter);
        if (!sequence.length) {
          setError('Unable to parse the script. Please check the formatting of the lines.');
          setIsLoading(false);
          return;
        }

        sequenceRef.current = sequence;
        assignVoices(sequence);
        updateLineState(0, sequence);
        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message || 'Failed to initialize practice mode.');
        setIsLoading(false);
      }
    };

    initialise();
  }, [assignVoices, updateLineState, scriptLines, extractedLines, userCharacter]);

  useEffect(() => {
    let didCancel = false;

    const autoRecord = async () => {
      if (!waitingForUserLine || showUserLine || isEvaluating) {
        cancelRecording();
        return;
      }

      if (!micSupported || !hasApiKey) {
        return;
      }

      try {
        if (!micPermission) {
          const granted = await requestPermission();
          if (!granted || didCancel) {
            return;
          }
        }

        if (!micRecording) {
          await startRecording();
        }
      } catch (err) {
        if (!didCancel) {
          console.error('Failed to start microphone recording:', err);
          showToast('Unable to access the microphone. Check permissions and try again.', 5000, 'error');
        }
      }
    };

    autoRecord();

    return () => {
      didCancel = true;
    };
  }, [waitingForUserLine, showUserLine, isEvaluating, micSupported, micPermission, micRecording, hasApiKey, requestPermission, startRecording, cancelRecording]);

  const handleApiKeySet = (hasKey) => {
    setHasApiKey(hasKey);
    if (hasKey) {
      setError(null);
    }
  };

  const handleStartPractice = async () => {
    if (!hasApiKey) {
      showToast(t.apiKeyRequired || 'This feature requires an OpenAI API key.', 4000, 'error');
      return;
    }

    if (!Array.isArray(extractedLines) || !extractedLines.length) {
      setError('No script lines found. Please go back and select a script with valid lines.');
      return;
    }

    if (micSupported && !micPermission) {
      const granted = await requestPermission();
      if (!granted) {
        showToast('Microphone access denied. Automatic evaluation will be unavailable.', 4000, 'warning');
      }
    }

    setSessionStarted(true);
    setTestComplete(false);
    setResults({ totalLines: 0, correctLines: 0, accuracy: 0 });

    const context = updateLineState(currentLineIndex);
    await playLines(context);
  };

  const handleSaidMyLine = async () => {
    if (!currentData.current || isEvaluating) return;

    setIsEvaluating(true);

    let evaluation = {
      status: 'no-input',
      transcript: '',
      accuracy: 0,
      message: 'No audio detected. Line marked for review.'
    };

    try {
      let transcript = '';

      if (micSupported && (micPermission || micRecording)) {
        const audioBlob = await stopRecording();
        if (audioBlob && audioBlob.size > 0) {
          transcript = await openaiService.speechToText(audioBlob);
        }
      }

      if (transcript) {
        const accuracy = calculateWordAccuracy(currentData.current.line, transcript);
        const isCorrect = accuracy >= 0.8;

        evaluation = {
          status: isCorrect ? 'correct' : 'incorrect',
          transcript,
          accuracy,
          message: isCorrect
            ? 'Great job! Your line matches the script.'
            : 'Your spoken line differs from the script. Review the transcript below.'
        };
      }
    } catch (err) {
      console.error('Error evaluating spoken line:', err);
      const friendly = friendlySttError(err);
      setError(friendly);
      evaluation = {
        status: 'error',
        transcript: '',
        accuracy: 0,
        message: friendly
      };
    } finally {
      setIsEvaluating(false);
      setShowUserLine(true);
      setLastEvaluation(evaluation);
      setResults(prev => {
        const total = prev.totalLines + 1;
        const correct = prev.correctLines + (evaluation.status === 'correct' ? 1 : 0);
        return {
          totalLines: total,
          correctLines: correct,
          accuracy: total > 0 ? (correct / total) * 100 : 0
        };
      });

      if (evaluation.message) {
        const tone = evaluation.status === 'correct' ? 'success' : evaluation.status === 'error' ? 'error' : 'warning';
        showToast(evaluation.message, 4000, tone);
      } else {
        showToast(t.practicePaused || 'Exercise paused. Review your line and continue when ready.', 3000, 'info');
      }
    }
  };

  const handleNeedHelp = () => {
    if (!currentData.current) return;
    cancelRecording();
    setShowUserLine(true);
    setLastEvaluation({
      status: 'revealed',
      transcript: '',
      accuracy: 0,
      message: 'Line revealed for assistance.'
    });
    showToast(t.needHelpToast || 'Here is your line. Take a look and continue when ready.', 3000, 'info');
  };

  const handleContinue = async () => {
    if (currentData.isLastLine) {
      setTestComplete(true);
      setWaitingForUserLine(false);
      setShowUserLine(false);
      showToast(t.testComplete || 'Practice complete!', 3000, 'success');
      return;
    }

    const nextIndex = currentLineIndex + 1;
    setCurrentLineIndex(nextIndex);
    setShowUserLine(false);
    setWaitingForUserLine(false);
    setLastEvaluation(null);

    const context = updateLineState(nextIndex);
    await playLines(context);
  };

  const handleRestart = async () => {
    setTestComplete(false);
    setResults({ totalLines: 0, correctLines: 0, accuracy: 0 });
    setCurrentLineIndex(0);
    setSessionStarted(true);
    setShowUserLine(false);
    setWaitingForUserLine(false);
    setLastEvaluation(null);

    const context = updateLineState(0);
    await playLines(context);
  };

  const handleVoiceChange = (character, voice) => {
    setCharacterVoices(prev => ({
      ...prev,
      [character]: voice
    }));
  };

  const handleVolumeChange = (event) => {
    setVolume(parseFloat(event.target.value));
  };

  const handleSpeedChange = (event) => {
    setSpeed(parseFloat(event.target.value));
  };

  const handleModelChange = (event) => {
    const newModelKey = event.target.value;
    setTtsModelKey(newModelKey);
    openaiService.setTtsModel(newModelKey);
    localStorage.setItem('openai_tts_model', newModelKey);
  };

  const renderVoiceSelectors = () => {
    if (!Object.keys(characterVoices).length) return null;

    return (
      <div className="character-voices">
        {Object.keys(characterVoices).map(character => (
          <div key={character} className="voice-row">
            <label>
              <span>{character}</span>
              <select
                value={characterVoices[character]}
                onChange={(event) => handleVoiceChange(character, event.target.value)}
              >
                {openaiService.getVoices().map(voice => (
                  <option key={voice} value={voice}>{voice}</option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>
    );
  };

  const handleEnableMicrophone = async () => {
    try {
      const granted = await requestPermission();
      if (granted) {
        showToast('Microphone enabled. Speak your line when prompted.', 3000, 'success');
      } else {
        showToast('Microphone access denied. Automatic evaluation will be unavailable.', 4000, 'warning');
      }
    } catch (err) {
      const friendly = friendlySttError(err);
      setError(friendly);
      showToast(friendly, 4000, 'error');
    }
  };

  const renderMicrophoneStatus = () => {
    if (!micSupported) {
      return (
        <p className="mic-status">Microphone not supported in this browser. Manual confirmation only.</p>
      );
    }

    if (!hasApiKey) {
      return null;
    }

    if (!micPermission) {
      return (
        <div className="recording-indicator">
          <p>Microphone disabled. Enable it for automatic feedback.</p>
          <button className="record-btn" onClick={handleEnableMicrophone}>
            Enable Microphone
          </button>
        </div>
      );
    }

    return (
      <div className={`recording-indicator${micRecording ? ' active' : ''}`}>
        <p>{micRecording ? 'Listening... speak your line now.' : 'Microphone ready.'}</p>
        {micRecorderError && (
          <p className="mic-error">{micRecorderError}</p>
        )}
      </div>
    );
  };

  const renderPlaybackState = () => {
    if (isPlaying) {
      const currentLine = otherCharacterLines[currentOtherLineIndex];
      return (
        <div className="other-character-speaking">
          {currentLine ? (
            <p>
              <strong>{currentLine.speaker}:</strong> {currentLine.line}
            </p>
          ) : (
            <p>{t.playingLine || 'Playing other character lines...'}</p>
          )}
        </div>
      );
    }

    if (waitingForUserLine) {
      return (
        <div className="user-line-container">
          {showUserLine ? (
            <div className="user-line">
              <strong>{currentData.current?.speaker || userCharacter || 'You'}:</strong> {currentData.current?.line || ''}
              <button className="hide-line-btn" onClick={handleContinue}>
                {t.continueButton || 'Continue to Next Line'}
              </button>
              {lastEvaluation && (
                <div className={`evaluation-panel ${lastEvaluation.status}`}>
                  {typeof lastEvaluation.accuracy === 'number' && lastEvaluation.accuracy > 0 && (
                    <p>
                      Accuracy: {(lastEvaluation.accuracy * 100).toFixed(0)}%
                    </p>
                  )}
                  {lastEvaluation.transcript && (
                    <p>
                      <strong>Transcript:</strong> {lastEvaluation.transcript}
                    </p>
                  )}
                  {lastEvaluation.message && (
                    <p>{lastEvaluation.message}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="user-prompt">
              <p>{(t.yourTurnPrompt && t.yourTurnPrompt.replace('{character}', userCharacter || 'You')) || `It's your turn, ${userCharacter || 'You'}!`}</p>
              <div className="user-actions">
                <button
                  className="said-line-btn"
                  onClick={handleSaidMyLine}
                  disabled={isEvaluating}
                >
                  {t.saidMyLineButton || 'I Said My Line'}
                </button>
                <button
                  className="need-help-btn"
                  onClick={handleNeedHelp}
                  disabled={isEvaluating}
                >
                  {t.needHelpButton || 'Need Help?'}
                </button>
              </div>
              <div className="mic-status-wrapper">
                {renderMicrophoneStatus()}
              </div>
              {isEvaluating && (
                <p className="evaluation-progress">Checking your line...</p>
              )}
            </div>
          )}
        </div>
      );
    }

    if (sessionStarted) {
      return (
        <div className="fallback-content">
          <p>{t.readyToContinue || 'Ready to continue practice?'}</p>
          <button className="continue-btn" onClick={() => playLines(updateLineState(currentLineIndex))}>
            {t.continueButton || 'Continue Practice'}
          </button>
        </div>
      );
    }

    return (
      <div className="start-test">
        <p>{t.startTestPrompt || 'Ready to start the practice?'}</p>
        <p className="instructions">
          {t.practiceInstructions ||
            'The system will play all other character lines using text-to-speech. When it\'s your turn, say your line out loud and click "I Said My Line" to reveal it.'}
        </p>
        <button className="start-btn" onClick={handleStartPractice} disabled={isPlaying}>
          {t.startButton || 'Start Practice'}
        </button>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="loading">
          <p>{t.loading || 'Loading...'}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error">
          <p>{error}</p>
          <button onClick={onBack} className="back-btn">
            {t.backButton || 'Back'}
          </button>
        </div>
      );
    }

    if (!hasApiKey) {
      return (
        <div className="api-key-container">
          <p className="api-key-notice">
            {t.apiKeyRequired || 'This feature requires an OpenAI API key to use text-to-speech.'}
          </p>
          <ApiKeyInput
            onKeySet={handleApiKeySet}
            translations={translations}
            currentLang={currentLang}
          />
          <button onClick={onBack} className="back-btn">
            {t.backButton || 'Back'}
          </button>
        </div>
      );
    }

    if (testComplete) {
      return (
        <div className="test-complete">
          <h2>{t.testComplete || 'Practice Complete!'}</h2>

          <div className="results-summary">
            <h3>{t.resultsSummary || 'Your Results'}</h3>
            <div className="results-stats">
              <div className="result-stat">
                <span className="stat-label">{t.totalLines || 'Total Lines'}</span>
                <span className="stat-value">{results.totalLines}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">{t.correctLines || 'Correct Lines'}</span>
                <span className="stat-value">{results.correctLines}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">{t.accuracy || 'Accuracy'}</span>
                <span className="stat-value">{results.accuracy.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="test-complete-actions">
            <button onClick={handleRestart} className="restart-btn">
              {t.restartButton || 'Practice Again'}
            </button>
            <button onClick={onBack} className="back-btn">
              {t.backButton || 'Back to Menu'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="voice-settings">
          <h3>{t.voiceSettings || 'Voice Settings'}</h3>
          <div className="voice-controls">
            <div className="volume-control">
              <label htmlFor="volume-slider">{t.volume || 'Volume'}</label>
              <input
                id="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
              />
            </div>
            <div className="speed-control">
              <label htmlFor="speed-slider">{t.speed || 'Speed'}</label>
              <input
                id="speed-slider"
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={speed}
                onChange={handleSpeedChange}
              />
            </div>
          </div>

          <div className="model-control">
            <label htmlFor="model-select">{t.ttsModel || 'Voice Quality'}</label>
            <select
              id="model-select"
              value={ttsModelKey}
              onChange={handleModelChange}
              className="model-select"
            >
              {Object.entries(openaiService.getTtsModels()).map(([key, model]) => (
                <option key={key} value={key}>{model}</option>
              ))}
            </select>
          </div>

          {renderVoiceSelectors()}
        </div>

        <div className="script-testing-container">
          {renderPlaybackState()}
        </div>

        <div className="navigation-buttons">
          <button onClick={onBack} className="back-btn">
            {t.backButton || 'Back to Menu'}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="interactive-memorization-view">
      <h1>{t.interactiveMemorizationTitle || 'Interactive Memorization Practice'}</h1>
      {renderContent()}
    </div>
  );
};

export default InteractiveMemorizationView;
