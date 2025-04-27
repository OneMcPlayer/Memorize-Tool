import React, { useState, useEffect, useCallback, useRef } from 'react';
import ttsService from '../../utils/ttsService';
import './InteractiveScriptTestingView.css';

/**
 * Interactive Script Testing View
 * 
 * This component implements a feature where the system plays all other roles
 * and waits for the user to say their lines. It uses TTS to speak the lines
 * of other characters.
 */
const InteractiveScriptTestingView = ({ 
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [characterVoices, setCharacterVoices] = useState({});
  const [voices, setVoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Voice settings
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  
  // Reference to store current line data
  const currentData = useRef({
    current: null,
    context: [],
    isLastLine: false
  });

  // Translations shorthand
  const t = translations[currentLang] || {};

  // Initialize TTS service and voices
  useEffect(() => {
    const initializeTTS = async () => {
      try {
        setIsLoading(true);
        console.log('Initializing TTS service for interactive testing...');

        // Configure TTS service
        ttsService.updateConfig({
          useWebSpeech: true,
          useGoogleTTS: true
        });

        // Check if TTS is available
        if (!ttsService.isAvailable()) {
          throw new Error('Text-to-speech is not supported in this browser');
        }

        // Get available voices
        if (ttsService.webSpeechAvailable) {
          // Get voices from the Web Speech API
          const availableVoices = window.speechSynthesis.getVoices();
          
          if (availableVoices.length === 0) {
            // If voices aren't loaded yet, wait for them
            window.speechSynthesis.onvoiceschanged = () => {
              const voices = window.speechSynthesis.getVoices();
              setVoices(voices);
              assignVoicesToCharacters(voices);
            };
          } else {
            setVoices(availableVoices);
            assignVoicesToCharacters(availableVoices);
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing TTS:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initializeTTS();

    // Clean up when component unmounts
    return () => {
      ttsService.stop();
    };
  }, []);

  // Prepare the script for testing
  useEffect(() => {
    prepareScriptForTesting();
  }, [scriptLines, extractedLines]);

  // Assign voices to characters
  const assignVoicesToCharacters = (availableVoices) => {
    if (!availableVoices || availableVoices.length === 0) return;

    // Extract unique characters from the script
    const characters = [...new Set(scriptLines.map(line => {
      const match = line.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
      return match ? match[1].trim() : null;
    }).filter(Boolean))];

    // Create voice assignments
    const voiceAssignments = {};
    characters.forEach((character, index) => {
      // Skip the user's character
      if (character === userCharacter) return;
      
      // Assign a voice from the available voices
      const voice = availableVoices[index % availableVoices.length];
      voiceAssignments[character] = voice;
    });

    console.log('Voice assignments:', voiceAssignments);
    setCharacterVoices(voiceAssignments);
  };

  // Prepare the script for testing by organizing lines by character
  const prepareScriptForTesting = useCallback(() => {
    if (!extractedLines || !extractedLines.length || !scriptLines || !scriptLines.length) return;

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
        if (speaker !== userCharacter) {
          parsedLines.push({ speaker, line: dialogue });
        }
      }
    });

    setOtherCharacterLines(parsedLines);
    updateCurrentLineData();
  }, [extractedLines, scriptLines, userCharacter]);

  // Update the current line data
  const updateCurrentLineData = useCallback(() => {
    if (!extractedLines || currentLineIndex >= extractedLines.length) return;

    const current = extractedLines[currentLineIndex];
    const isLastLine = currentLineIndex === extractedLines.length - 1;

    // Get context lines (previous lines)
    const context = [];
    if (currentLineIndex > 0) {
      // Add the previous line as context
      context.push(extractedLines[currentLineIndex - 1]);
    }

    currentData.current = {
      current,
      context,
      isLastLine
    };
  }, [extractedLines, currentLineIndex]);

  // Play other character lines
  const playOtherCharacterLines = async () => {
    if (!otherCharacterLines.length || currentOtherLineIndex >= otherCharacterLines.length) {
      setWaitingForUserLine(true);
      return;
    }

    setIsPlaying(true);
    setIsPaused(false);

    try {
      // Play each line from other characters until we reach the user's line
      for (let i = currentOtherLineIndex; i < otherCharacterLines.length; i++) {
        setCurrentOtherLineIndex(i);
        const line = otherCharacterLines[i];
        
        // Get the voice for this character
        const voice = characterVoices[line.speaker];

        // Play the line using TTS
        await ttsService.speak(line.line, {
          voice: voice,
          volume: volume,
          rate: rate,
          pitch: pitch
        });

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
    setCurrentLineIndex(prevIndex => prevIndex + 1);
    setCurrentOtherLineIndex(0);
    setWaitingForUserLine(false);
    updateCurrentLineData();
    
    // Start playing other character lines
    setTimeout(() => {
      playOtherCharacterLines();
    }, 500);
  };

  // Handle restart button click
  const handleRestart = () => {
    setCurrentLineIndex(0);
    setCurrentOtherLineIndex(0);
    setWaitingForUserLine(false);
    setTestComplete(false);
    updateCurrentLineData();
    
    // Start playing other character lines
    setTimeout(() => {
      playOtherCharacterLines();
    }, 500);
  };

  // Handle back button click
  const handleBack = () => {
    ttsService.stop();
    onBack();
  };

  // Handle voice change for a character
  const handleVoiceChange = (character, voiceIndex) => {
    const selectedVoice = voices[voiceIndex];
    
    setCharacterVoices(prev => ({
      ...prev,
      [character]: selectedVoice
    }));
  };

  // Start the test
  const handleStartTest = () => {
    playOtherCharacterLines();
  };

  // Render the component
  return (
    <div className="interactive-script-testing-view">
      <h1>{t.scriptTestingMode || 'Script Testing Mode'}</h1>
      
      {isLoading ? (
        <div className="loading">
          <p>{t.loading || 'Loading voices...'}</p>
        </div>
      ) : error ? (
        <div className="error">
          <p>{error}</p>
          <button onClick={handleBack} className="back-btn">
            {t.backButton || 'Back'}
          </button>
        </div>
      ) : testComplete ? (
        <div className="test-complete">
          <h2>{t.testComplete || 'Test Complete!'}</h2>
          <p>{t.testCompleteMessage || 'You have completed the script test.'}</p>
          <div className="test-complete-actions">
            <button onClick={handleRestart} className="restart-btn">
              {t.restartButton || 'Restart'}
            </button>
            <button onClick={handleBack} className="back-btn">
              {t.backButton || 'Back'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="voice-settings">
            <h3>{t.voiceSettings || 'Voice Settings'}</h3>
            <div className="voice-controls">
              <div className="voice-control">
                <label htmlFor="volume">{t.volume || 'Volume'}: {volume.toFixed(1)}</label>
                <input
                  id="volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                />
              </div>
              <div className="voice-control">
                <label htmlFor="rate">{t.rate || 'Rate'}: {rate.toFixed(1)}</label>
                <input
                  id="rate"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                />
              </div>
              <div className="voice-control">
                <label htmlFor="pitch">{t.pitch || 'Pitch'}: {pitch.toFixed(1)}</label>
                <input
                  id="pitch"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                />
              </div>
            </div>
            
            <div className="character-voices">
              <h3>{t.characterVoices || 'Character Voices'}</h3>
              {Object.keys(characterVoices).map((character) => (
                <div key={character} className="character-voice">
                  <label htmlFor={`voice-${character}`}>{character}:</label>
                  <select
                    id={`voice-${character}`}
                    value={voices.indexOf(characterVoices[character])}
                    onChange={(e) => handleVoiceChange(character, parseInt(e.target.value))}
                  >
                    {voices.map((voice, index) => (
                      <option key={index} value={index}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          
          <div className="script-testing-container">
            {!isPlaying && !waitingForUserLine && currentLineIndex === 0 && (
              <div className="start-test">
                <p>{t.startTestPrompt || 'Ready to start the test?'}</p>
                <button onClick={handleStartTest} className="start-btn">
                  {t.startButton || 'Start Test'}
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
                    <strong>{currentData.current?.current?.speaker}:</strong> {currentData.current?.current?.line}
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
            )}
          </div>
          
          <div className="navigation-buttons">
            <button onClick={handleBack} className="back-btn">
              {t.backButton || 'Back'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default InteractiveScriptTestingView;
