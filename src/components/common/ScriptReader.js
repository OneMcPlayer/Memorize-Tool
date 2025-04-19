import React, { useState, useEffect, useMemo } from 'react';
import {
  getAvailableVoices,
  assignVoicesToCharacters,
  speakText,
  cancelSpeech,
  pauseSpeech,
  resumeSpeech,
  isSpeechSynthesisSupported
} from '../../utils/speechSynthesis';

const ScriptReader = ({ script, onClose }) => {
  const [voices, setVoices] = useState([]);
  const [characterVoices, setCharacterVoices] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);

  // Extract unique characters from the script
  const characters = useMemo(() => {
    return [...new Set(script.map(line => line.speaker))];
  }, [script]);

  // Load available voices
  useEffect(() => {
    const loadVoices = async () => {
      try {
        setIsLoading(true);
        console.log('Checking speech synthesis support...');

        if (!isSpeechSynthesisSupported()) {
          throw new Error('Speech synthesis is not supported in this browser');
        }

        console.log('Speech synthesis is supported, getting voices...');
        const availableVoices = await getAvailableVoices();
        console.log(`Got ${availableVoices.length} voices`);

        if (availableVoices.length === 0) {
          console.warn('No voices available, using default voice');
          // Create a default voice if none are available
          const defaultVoice = new SpeechSynthesisUtterance().voice;
          setVoices(defaultVoice ? [defaultVoice] : []);
        } else {
          setVoices(availableVoices);
        }

        // Auto-assign voices to characters
        const voiceAssignments = assignVoicesToCharacters(characters, availableVoices);
        console.log('Voice assignments:', voiceAssignments);
        setCharacterVoices(voiceAssignments);

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading voices:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    loadVoices();

    // Clean up speech synthesis when component unmounts
    return () => {
      console.log('Cleaning up speech synthesis');
      cancelSpeech();
    };
  }, [characters]);

  // Handle voice selection for a character
  const handleVoiceChange = (character, voiceURI) => {
    const selectedVoice = voices.find(voice => voice.voiceURI === voiceURI);

    setCharacterVoices(prev => ({
      ...prev,
      [character]: selectedVoice
    }));
  };

  // Play the entire script
  const playScript = async () => {
    try {
      console.log('Starting playback...');
      setIsPlaying(true);
      setIsPaused(false);
      setError(null); // Clear any previous errors

      // Start from the beginning if not already playing
      if (currentLineIndex === -1) {
        setCurrentLineIndex(0);
      }

      // Check if speech synthesis is supported
      if (!window.speechSynthesis) {
        throw new Error('Speech synthesis is not supported in this browser');
      }

      // Check if we have voices available
      if (!voices || voices.length === 0) {
        console.warn('No voices available, using default voice');
      }

      // Force a user interaction with speech synthesis
      // This helps browsers that require user interaction to allow speech
      window.speechSynthesis.cancel();

      // Create a test utterance to check if speech synthesis works
      const testUtterance = new SpeechSynthesisUtterance('Test');
      testUtterance.volume = 0.1; // Very quiet but not silent
      testUtterance.onend = () => console.log('Test utterance completed');
      testUtterance.onerror = (e) => console.warn('Test utterance failed:', e);

      // Speak the test utterance
      window.speechSynthesis.speak(testUtterance);

      // Wait a moment to let the test utterance start
      await new Promise(resolve => setTimeout(resolve, 500));

      // Cancel any ongoing speech before starting the real playback
      window.speechSynthesis.cancel();

      // Play from current line to the end
      for (let i = Math.max(0, currentLineIndex); i < script.length; i++) {
        if (!isPlaying) {
          console.log('Playback stopped by user');
          break; // Stop if play was cancelled
        }

        setCurrentLineIndex(i);
        const line = script[i];
        console.log(`Playing line ${i}: ${line.speaker}: ${line.line}`);

        // Get the voice for this character
        const voice = characterVoices[line.speaker];

        // Only speak the dialogue, not the speaker name
        try {
          // Speak the text and wait for it to complete or timeout
          await speakText(line.line, voice, rate, pitch, volume);

          // Add a small pause between lines
          if (i < script.length - 1) { // Don't pause after the last line
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (lineError) {
          console.error(`Error speaking line ${i}:`, lineError);
          // Continue with next line instead of stopping completely
        }
      }

      console.log('Playback complete');
      // Reset when finished
      setIsPlaying(false);
      setCurrentLineIndex(-1);
    } catch (err) {
      console.error('Error during playback:', err);
      setError(`Error during playback: ${err.message}`);
      setIsPlaying(false);
      cancelSpeech(); // Make sure to cancel any ongoing speech
    }
  };

  // Stop playback
  const stopPlayback = () => {
    cancelSpeech();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
  };

  // Pause playback
  const pausePlayback = () => {
    pauseSpeech();
    setIsPaused(true);
  };

  // Resume playback
  const resumePlayback = () => {
    resumeSpeech();
    setIsPaused(false);
    playScript(); // Continue from current line
  };

  if (isLoading) {
    return <div className="script-reader loading">Loading voices...</div>;
  }

  if (error) {
    return (
      <div className="script-reader error">
        <h2>Error</h2>
        <p>{error}</p>
        <p className="error-help">
          Speech synthesis may not be fully supported in your browser, or your browser might be blocking it.
          Try using a different browser like Chrome or Edge, or check your browser settings.
        </p>
        <button onClick={onClose} className="close-button">Close</button>
      </div>
    );
  }

  return (
    <div className="script-reader">
      <h2>Script Reader</h2>

      <div className="user-interaction-notice">
        <p>
          <strong>Note:</strong> Speech synthesis may require specific browser permissions.
          If you don't hear anything after clicking Play:
        </p>
        <ol>
          <li>Make sure your device volume is turned up</li>
          <li>Try clicking on the page several times before pressing Play</li>
          <li>Check if your browser (Chrome, Edge, etc.) has permissions to play audio</li>
          <li>Some browsers may block speech synthesis in certain contexts</li>
        </ol>
      </div>

      <div className="voice-controls">
        <h3>Voice Settings</h3>

        <div className="voice-assignments">
          {characters.map(character => (
            <div key={character} className="character-voice">
              <label htmlFor={`voice-${character}`}>{character}:</label>
              <select
                id={`voice-${character}`}
                value={characterVoices[character]?.voiceURI || ''}
                onChange={(e) => handleVoiceChange(character, e.target.value)}
              >
                {voices.map(voice => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="playback-settings">
          <div className="setting">
            <label htmlFor="rate">Speed:</label>
            <input
              id="rate"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
            />
            <span>{rate.toFixed(1)}x</span>
          </div>

          <div className="setting">
            <label htmlFor="pitch">Pitch:</label>
            <input
              id="pitch"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
            />
            <span>{pitch.toFixed(1)}</span>
          </div>

          <div className="setting">
            <label htmlFor="volume">Volume:</label>
            <input
              id="volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
            />
            <span>{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="playback-controls">
        {!isPlaying || isPaused ? (
          <button
            onClick={isPaused ? resumePlayback : playScript}
            className="play-button"
          >
            {isPaused ? 'Resume' : 'Play'}
          </button>
        ) : (
          <button
            onClick={pausePlayback}
            className="pause-button"
          >
            Pause
          </button>
        )}

        <button
          onClick={stopPlayback}
          className="stop-button"
          disabled={!isPlaying && currentLineIndex === -1}
        >
          Stop
        </button>
      </div>

      {currentLineIndex >= 0 && (
        <div className="current-line">
          <strong>{script[currentLineIndex].speaker}:</strong> {script[currentLineIndex].line}
        </div>
      )}

      <button onClick={onClose} className="close-button">Close</button>

      <div className="script-reader-footer">
        <p className="note">Note: Voice quality and availability depends on your browser and operating system.</p>
      </div>
    </div>
  );
};

export default ScriptReader;
