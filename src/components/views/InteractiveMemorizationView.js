import React, { useState, useEffect, useRef } from 'react';
import openaiService from '../../services/openaiService';
import ApiKeyInput from '../common/ApiKeyInput';
import { showToast } from '../../utils';
import './InteractiveMemorizationView.css';

/**
 * Interactive Memorization View
 *
 * This component implements a feature where the system plays all other roles
 * using OpenAI's TTS API and listens to the user's speech using OpenAI's STT API.
 * It provides feedback on whether the user's lines match the expected lines.
 */
const InteractiveMemorizationView = ({
  scriptLines,
  extractedLines,
  userCharacter,
  onBack,
  translations,
  currentLang
}) => {
  // State for managing the testing flow
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [otherCharacterLines, setOtherCharacterLines] = useState([]);
  const [currentOtherLineIndex, setCurrentOtherLineIndex] = useState(0);
  const [waitingForUserLine, setWaitingForUserLine] = useState(false);
  const [showUserLine, setShowUserLine] = useState(false);
  const [testComplete, setTestComplete] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedText, setRecordedText] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [results, setResults] = useState({
    totalLines: 0,
    correctLines: 0,
    accuracy: 0
  });

  // State for UI and settings
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [characterVoices, setCharacterVoices] = useState({});
  const [volume, setVolume] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
  const [ttsModelKey, setTtsModelKey] = useState('hd'); // Default to HD model
  const [currentData, setCurrentData] = useState({
    current: null,
    context: []
  });

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Get translations
  const t = translations[currentLang] || {};

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);

        // Check if OpenAI API key is set
        const hasKey = openaiService.hasApiKey();
        setHasApiKey(hasKey);

        // Load saved TTS model preference
        const savedModelKey = localStorage.getItem('openai_tts_model');
        if (savedModelKey && openaiService.getTtsModels()[savedModelKey]) {
          setTtsModelKey(savedModelKey);
        }

        // Parse script to extract other character lines
        parseScript();

        // Assign default voices to characters
        assignVoicesToCharacters();

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initialize();

    // Clean up when component unmounts
    return () => {
      stopRecording();
    };
  }, []);

  // Parse script to extract other character lines
  const parseScript = () => {
    // Get all lines from the script
    const relevantScriptLines = scriptLines.filter(line => line.trim());
    const parsedLines = [];

    relevantScriptLines.forEach(line => {
      if (!line.trim()) return; // Skip empty lines

      // Use regex to extract speaker and dialogue
      const match = line.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
      if (match) {
        const speaker = match[1].trim();
        const dialogue = match[2].trim();

        // Only include lines from other characters
        if (speaker !== userCharacter) {
          parsedLines.push({ speaker, line: dialogue });
        }
      }
    });

    setOtherCharacterLines(parsedLines);
    updateCurrentLineData();
  };

  // Assign voices to characters
  const assignVoicesToCharacters = () => {
    const voices = openaiService.getVoices();
    const voiceAssignments = {};

    // Get unique character names
    const characters = [...new Set(otherCharacterLines.map(line => line.speaker))];

    // Assign voices to characters
    characters.forEach((character, index) => {
      // Cycle through available voices
      const voiceIndex = index % voices.length;
      voiceAssignments[character] = voices[voiceIndex];
    });

    setCharacterVoices(voiceAssignments);
  };

  // Update current line data
  const updateCurrentLineData = () => {
    if (currentLineIndex >= extractedLines.length) {
      setCurrentData({ current: null, context: [] });
      return;
    }

    const currentEntry = extractedLines[currentLineIndex];
    setCurrentData({
      current: currentEntry,
      context: [],
      isLastLine: currentLineIndex === extractedLines.length - 1
    });
  };

  // Handle API key set
  const handleApiKeySet = (hasKey) => {
    setHasApiKey(hasKey);
    if (hasKey) {
      // Re-initialize with API key
      assignVoicesToCharacters();
    }
  };

  // Start the test
  const handleStartTest = () => {
    if (!hasApiKey) {
      setError('OpenAI API key is required to use this feature');
      return;
    }

    playOtherCharacterLines();
  };

  // Play other character lines
  const playOtherCharacterLines = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    setIsPaused(false);

    try {
      // Play each line from other characters until we reach the user's line
      for (let i = currentOtherLineIndex; i < otherCharacterLines.length; i++) {
        setCurrentOtherLineIndex(i);
        const line = otherCharacterLines[i];

        // Get the voice for this character
        const voice = characterVoices[line.speaker] || openaiService.defaultVoice;

        // Get the current TTS model
        const model = openaiService.getTtsModels()[ttsModelKey];

        // Generate and play TTS audio
        const audioBlob = await openaiService.textToSpeech(line.line, {
          voice: voice,
          speed: speed,
          model: model
        });

        // Play the audio
        await openaiService.playAudio(audioBlob);

        // Add a small pause between lines
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (err) {
      console.error('Error playing other character lines:', err);
      setError('Error playing audio. Please try again.');
    } finally {
      setIsPlaying(false);
      setWaitingForUserLine(true);
    }
  };

  // Start recording user's speech
  const startRecording = async () => {
    try {
      // Reset state
      setIsRecording(true);
      setRecordedText('');
      setIsCorrect(null);
      setShowComparison(false);

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          // Create audio blob from chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];

          // Convert speech to text
          const text = await openaiService.speechToText(audioBlob);
          setRecordedText(text);

          // Compare with expected line
          const expectedLine = currentData.current?.line || '';
          const similarity = calculateSimilarity(text, expectedLine);
          const isCorrect = similarity >= 0.7; // 70% similarity threshold

          setIsCorrect(isCorrect);
          setShowComparison(true);

          // Update results
          setResults(prev => ({
            totalLines: prev.totalLines + 1,
            correctLines: prev.correctLines + (isCorrect ? 1 : 0),
            accuracy: ((prev.correctLines + (isCorrect ? 1 : 0)) / (prev.totalLines + 1)) * 100
          }));
        } catch (err) {
          console.error('Error processing speech:', err);
          showToast('Error processing speech. Please try again.', 3000, 'error');
        } finally {
          setIsRecording(false);
        }
      };

      // Start recording
      mediaRecorder.start();
      audioChunksRef.current = [];

    } catch (err) {
      console.error('Error starting recording:', err);
      setIsRecording(false);
      showToast('Error accessing microphone. Please check permissions.', 3000, 'error');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Calculate similarity between two strings
  const calculateSimilarity = (str1, str2) => {
    // Convert to lowercase and remove punctuation for comparison
    const normalize = (str) => str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();

    const s1 = normalize(str1);
    const s2 = normalize(str2);

    // Simple word-based comparison
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);

    // Count matching words
    let matches = 0;
    for (const word of words1) {
      if (words2.includes(word)) {
        matches++;
      }
    }

    // Calculate similarity ratio
    const totalWords = Math.max(words1.length, words2.length);
    return totalWords > 0 ? matches / totalWords : 0;
  };

  // Handle when the user indicates they've said their line
  const handleSaidMyLine = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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
  const handleNextLine = () => {
    // Reset state for next line
    setShowComparison(false);
    setRecordedText('');
    setIsCorrect(null);

    // If this is the last line, mark the test as complete
    if (currentLineIndex >= extractedLines.length - 1) {
      setTestComplete(true);
    } else {
      // Move to the next user line
      setCurrentLineIndex(prevIndex => prevIndex + 1);
      setCurrentOtherLineIndex(0);
      setWaitingForUserLine(false);
      updateCurrentLineData();

      // Start playing other character lines
      setTimeout(() => {
        playOtherCharacterLines();
      }, 500);
    }
  };

  // Handle restart button click
  const handleRestart = () => {
    setCurrentLineIndex(0);
    setCurrentOtherLineIndex(0);
    setWaitingForUserLine(false);
    setTestComplete(false);
    setShowComparison(false);
    setRecordedText('');
    setIsCorrect(null);
    setResults({
      totalLines: 0,
      correctLines: 0,
      accuracy: 0
    });
    updateCurrentLineData();

    // Start playing other character lines
    setTimeout(() => {
      playOtherCharacterLines();
    }, 500);
  };

  // Handle back button click
  const handleBack = () => {
    stopRecording();
    onBack();
  };

  // Handle voice change for a character
  const handleVoiceChange = (character, voice) => {
    setCharacterVoices(prev => ({
      ...prev,
      [character]: voice
    }));
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  // Handle speed change
  const handleSpeedChange = (e) => {
    setSpeed(parseFloat(e.target.value));
  };

  // Handle TTS model change
  const handleModelChange = (e) => {
    const newModelKey = e.target.value;
    setTtsModelKey(newModelKey);
    openaiService.setTtsModel(newModelKey);
    localStorage.setItem('openai_tts_model', newModelKey);
  };

  // Render the component
  return (
    <div className="interactive-memorization-view">
      <h1>{t.interactiveMemorizationTitle || 'Interactive Memorization Practice'}</h1>

      {isLoading ? (
        <div className="loading">
          <p>{t.loading || 'Loading...'}</p>
        </div>
      ) : error ? (
        <div className="error">
          <p>{error}</p>
          <button onClick={handleBack} className="back-btn">
            {t.backButton || 'Back'}
          </button>
        </div>
      ) : !hasApiKey ? (
        <div className="api-key-container">
          <p className="api-key-notice">
            {t.apiKeyRequired || 'This feature requires an OpenAI API key to use text-to-speech and speech recognition.'}
          </p>
          <ApiKeyInput
            onKeySet={handleApiKeySet}
            translations={translations}
            currentLang={currentLang}
          />
          <button onClick={handleBack} className="back-btn">
            {t.backButton || 'Back'}
          </button>
        </div>
      ) : testComplete ? (
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
            <button onClick={handleBack} className="back-btn">
              {t.backButton || 'Back to Menu'}
            </button>
          </div>
        </div>
      ) : (
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
                <option value="standard">{t.standardQuality || 'Standard (Faster)'}</option>
                <option value="hd">{t.hdQuality || 'High Definition'}</option>
                <option value="advanced">{t.advancedQuality || 'Advanced (Best Quality)'}</option>
              </select>
              <p className="model-description">
                {ttsModelKey === 'standard' && (t.standardModelDescription || 'Optimized for speed, lower quality')}
                {ttsModelKey === 'hd' && (t.hdModelDescription || 'Good balance of quality and speed')}
                {ttsModelKey === 'advanced' && (t.advancedModelDescription || 'Best quality, may be slower')}
              </p>
            </div>

            <div className="character-voices">
              <h4>{t.characterVoices || 'Character Voices'}</h4>
              <div className="character-voice-list">
                {Object.keys(characterVoices).map((character, index) => (
                  <div key={index} className="character-voice-item">
                    <span className="character-name">{character}</span>
                    <select
                      value={characterVoices[character]}
                      onChange={(e) => handleVoiceChange(character, e.target.value)}
                    >
                      {openaiService.getVoices().map((voice, i) => (
                        <option key={i} value={voice}>
                          {voice}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="script-testing-container">
            {!isPlaying && !waitingForUserLine && currentLineIndex === 0 && (
              <div className="start-test">
                <p>{t.startTestPrompt || 'Ready to start the practice?'}</p>
                <p className="instructions">
                  {t.practiceInstructions ||
                    'The system will play all other character lines using text-to-speech. ' +
                    'When it\'s your turn, you\'ll need to say your line. ' +
                    'The system will listen and check if your line matches the script.'}
                </p>
                <button onClick={handleStartTest} className="start-btn">
                  {t.startButton || 'Start Practice'}
                </button>
              </div>
            )}

            {isPlaying && (
              <div className="other-character-speaking">
                <p>
                  <strong>{otherCharacterLines[currentOtherLineIndex]?.speaker}:</strong> {otherCharacterLines[currentOtherLineIndex]?.line}
                </p>
              </div>
            )}

            {waitingForUserLine && (
              <div className="user-line-container">
                {showUserLine ? (
                  <div className="user-line">
                    <strong>{currentData.current?.speaker}:</strong> {currentData.current?.line}
                    <button className="hide-line-btn" onClick={handleHideLine}>
                      {t.hideLineButton || 'Hide Line'}
                    </button>
                  </div>
                ) : showComparison ? (
                  <div className="comparison-container">
                    <div className="comparison-result">
                      <div className={`result-indicator ${isCorrect ? 'correct' : 'incorrect'}`}>
                        {isCorrect ?
                          (t.correctIndicator || '✓ Correct') :
                          (t.incorrectIndicator || '✗ Incorrect')}
                      </div>
                    </div>

                    <div className="comparison-lines">
                      <div className="expected-line">
                        <strong>{t.expectedLine || 'Expected'}:</strong> {currentData.current?.line}
                      </div>
                      <div className="your-line">
                        <strong>{t.yourLine || 'You said'}:</strong> {recordedText}
                      </div>
                    </div>

                    <button className="next-line-btn" onClick={handleNextLine}>
                      {currentData.isLastLine ?
                        (t.finishButton || 'Finish Practice') :
                        (t.nextLineButton || 'Next Line')}
                    </button>
                  </div>
                ) : (
                  <div className="user-prompt">
                    <p>{(t.yourTurnPrompt && t.yourTurnPrompt.replace('{character}', userCharacter)) || `It's your turn, ${userCharacter}!`}</p>
                    <div className="user-actions">
                      <button
                        className={`record-btn ${isRecording ? 'recording' : ''}`}
                        onClick={handleSaidMyLine}
                      >
                        {isRecording ?
                          (t.stopRecordingButton || 'Stop Recording') :
                          (t.startRecordingButton || 'Start Recording')}
                      </button>
                      <button className="need-help-btn" onClick={handleNeedHelp}>
                        {t.needHelpButton || 'Need Help?'}
                      </button>
                    </div>
                    {isRecording && (
                      <div className="recording-indicator">
                        <div className="recording-pulse"></div>
                        <p>{t.recordingIndicator || 'Recording... Speak your line'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="navigation-buttons">
            <button onClick={handleBack} className="back-btn">
              {t.backButton || 'Back to Menu'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default InteractiveMemorizationView;
