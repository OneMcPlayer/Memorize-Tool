import React, { useState, useEffect, useMemo } from 'react';
import ttsService from '../../utils/ttsService';

const ScriptReader = ({ script, onClose }) => {
  const [voices, setVoices] = useState([]);
  const [characterVoices, setCharacterVoices] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Voice settings for TTS
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);

  // Extract unique characters from the script
  const characters = useMemo(() => {
    return [...new Set(script.map(line => line.speaker))];
  }, [script]);

  // Set up voices and character assignments
  useEffect(() => {
    try {
      setIsLoading(true);
      console.log('Initializing TTS service...');

      // Configure TTS service to prioritize Web Speech API
      ttsService.updateConfig({
        useWebSpeech: true,
        useGoogleTTS: true
      });

      // Check if TTS is available
      if (!ttsService.isAvailable()) {
        throw new Error('Text-to-speech is not supported in this browser');
      }

      // Get available voices from the TTS service
      const availableVoices = ttsService.getVoices();

      // If no voices are available yet, wait for them to load
      if (availableVoices.length === 0 && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
          const updatedVoices = window.speechSynthesis.getVoices();
          processVoices(updatedVoices);
        };
      } else {
        processVoices(availableVoices);
      }

    } catch (err) {
      console.error('Error initializing TTS service:', err);
      setError(err.message);
      setIsLoading(false);
    }

    // Process and organize available voices
    function processVoices(availableVoices) {
      try {
        // If we have actual voices from the browser
        if (availableVoices.length > 0) {
          console.log(`Found ${availableVoices.length} voices from Web Speech API`);
          setVoices(availableVoices);

          // Group voices by language for better selection
          const voicesByLang = {};
          availableVoices.forEach(voice => {
            const langCode = voice.lang.split('-')[0]; // Get primary language code
            if (!voicesByLang[langCode]) {
              voicesByLang[langCode] = [];
            }
            voicesByLang[langCode].push(voice);
          });

          // Auto-assign voices to characters
          const voiceAssignments = {};
          characters.forEach((character, index) => {
            // Try to assign different languages to different characters
            const langCodes = Object.keys(voicesByLang);
            const langCode = langCodes[index % langCodes.length];
            const langVoices = voicesByLang[langCode];

            // Pick a voice from the selected language
            const voice = langVoices[index % langVoices.length];
            voiceAssignments[character] = voice;
          });

          console.log('Voice assignments:', voiceAssignments);
          setCharacterVoices(voiceAssignments);
        } else {
          // Fallback to predefined language preferences if no voices are available
          console.log('No voices available, using predefined language preferences');
          const languagePreferences = [
            { lang: 'en-US', name: 'English (US)' },
            { lang: 'en-GB', name: 'English (UK)' },
            { lang: 'it-IT', name: 'Italian' },
            { lang: 'fr-FR', name: 'French' },
            { lang: 'de-DE', name: 'German' },
            { lang: 'es-ES', name: 'Spanish' },
            { lang: 'ru-RU', name: 'Russian' },
            { lang: 'ja-JP', name: 'Japanese' },
          ];

          setVoices(languagePreferences);

          // Auto-assign languages to characters
          const voiceAssignments = {};
          characters.forEach((character, index) => {
            const voice = languagePreferences[index % languagePreferences.length];
            voiceAssignments[character] = voice;
          });

          console.log('Language assignments:', voiceAssignments);
          setCharacterVoices(voiceAssignments);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error processing voices:', err);
        setError(err.message);
        setIsLoading(false);
      }
    }

    // Clean up when component unmounts
    return () => {
      console.log('Cleaning up TTS service');
      ttsService.stop();
    };
  }, [characters]);

  // Handle language selection for a character
  const handleVoiceChange = (character, langCode) => {
    const selectedVoice = voices.find(voice => voice.lang === langCode);

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

      // Stop any ongoing audio
      ttsService.stop();

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

        // Only play the dialogue, not the speaker name
        try {
          // Play the text using the TTS service
          await ttsService.speak(line.line, {
            voice: voice,
            volume: volume,
            rate: rate,
            pitch: pitch
          });

          // Add a small pause between lines
          if (i < script.length - 1) { // Don't pause after the last line
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (lineError) {
          console.error(`Error playing line ${i}:`, lineError);
          // Continue with next line instead of stopping completely
          await new Promise(resolve => setTimeout(resolve, 500));
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
      ttsService.stop(); // Make sure to stop any ongoing audio
    }
  };

  // Stop playback
  const stopPlayback = () => {
    ttsService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
  };

  // Pause playback
  const pausePlayback = () => {
    // Note: Our TTS service doesn't support pause/resume
    // So we just stop playback
    ttsService.stop();
    setIsPaused(true);
  };

  // Resume playback
  const resumePlayback = () => {
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
      <button onClick={onClose} className="close-button">Close</button>

      <div className="script-reader-content">
        <div className="user-interaction-notice">
          <p>
            <strong>Note:</strong> This feature uses your browser's speech synthesis capabilities.
          </p>
          <ol>
            <li>Make sure your device volume is turned up</li>
            <li>Each character will speak in their assigned language</li>
            <li>You can change a character's language using the dropdown</li>
            <li>If audio doesn't play, try clicking the Play button again</li>
            <li>Some browsers may block audio playback until you interact with the page</li>
            <li>If one voice method fails, the system will automatically try alternative methods</li>
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
                  value={characterVoices[character]?.lang || ''}
                  onChange={(e) => handleVoiceChange(character, e.target.value)}
                >
                  {voices.map(voice => (
                    <option key={voice.lang} value={voice.lang}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="playback-settings">
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
          </div>
        </div>

        {currentLineIndex >= 0 && (
          <div className="current-line">
            <strong>{script[currentLineIndex].speaker}:</strong> {script[currentLineIndex].line}
          </div>
        )}
      </div>

      <div className="script-reader-footer">
        {isPlaying && (
          <div className="audio-indicator" data-test="audio-playing-indicator">
            <div className="audio-wave"></div>
            <span>Audio playing...</span>
          </div>
        )}
        <div className="playback-controls">
          {!isPlaying || isPaused ? (
            <button
              onClick={isPaused ? resumePlayback : playScript}
              className="play-button"
              data-test="play-button"
              aria-label={isPaused ? 'Resume playback' : 'Start playback'}
            >
              {isPaused ? 'Resume' : 'Play'}
            </button>
          ) : (
            <button
              onClick={pausePlayback}
              className="pause-button"
              data-test="pause-button"
              aria-label="Pause playback"
            >
              Pause
            </button>
          )}

          <button
            onClick={stopPlayback}
            className="stop-button"
            data-test="stop-button"
            aria-label="Stop playback"
            disabled={!isPlaying && currentLineIndex === -1}
          >
            Stop
          </button>
        </div>
        <p className="note">Voice quality and availability depends on your browser and operating system.</p>
      </div>
    </div>
  );
};

export default ScriptReader;
