import React, { useState, useEffect, useMemo } from 'react';
import audioPlayer from '../../utils/basicAudioPlayer';
import ttsService from '../../utils/ttsService';

const ScriptReader = ({ script, onClose }) => {
  const [voices, setVoices] = useState([]);
  const [characterVoices, setCharacterVoices] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Volume state for audio playback
  const [volume, setVolume] = useState(1);

  // Extract unique characters from the script
  const characters = useMemo(() => {
    return [...new Set(script.map(line => line.speaker))];
  }, [script]);

  // Set up language preferences for characters
  useEffect(() => {
    try {
      setIsLoading(true);
      console.log('Initializing audio player...');

      if (!audioPlayer.isSupported()) {
        throw new Error('Audio playback is not supported in this browser');
      }

      // Define some language preferences for different characters
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
        // Assign a language to each character
        const voice = languagePreferences[index % languagePreferences.length];
        voiceAssignments[character] = voice;
      });

      console.log('Language assignments:', voiceAssignments);
      setCharacterVoices(voiceAssignments);

      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing audio player:', err);
      setError(err.message);
      setIsLoading(false);
    }

    // Clean up when component unmounts
    return () => {
      console.log('Cleaning up audio player');
      audioPlayer.stop();
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
      audioPlayer.stop();

      // Play from current line to the end
      for (let i = Math.max(0, currentLineIndex); i < script.length; i++) {
        if (!isPlaying) {
          console.log('Playback stopped by user');
          break; // Stop if play was cancelled
        }

        setCurrentLineIndex(i);
        const line = script[i];
        console.log(`Playing line ${i}: ${line.speaker}: ${line.line}`);

        // Get the language preference for this character
        const voice = characterVoices[line.speaker];

        // Only play the dialogue, not the speaker name
        try {
          // Play the text using our audio player
          await audioPlayer.playText(line.line, {
            voice: voice,
            volume: volume
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
      audioPlayer.stop(); // Make sure to stop any ongoing audio
    }
  };

  // Stop playback
  const stopPlayback = () => {
    audioPlayer.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
  };

  // Pause playback
  const pausePlayback = () => {
    // Note: Our audio player doesn't support pause/resume
    // So we just stop playback
    audioPlayer.stop();
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

          <div className="setting-note">
            <p>Note: Speed and pitch controls are not available with the audio playback method.</p>
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
