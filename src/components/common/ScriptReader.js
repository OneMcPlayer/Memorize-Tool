import React, { useState, useEffect, useMemo } from 'react';
import tts from '../../utils/simpleSpeechSynthesis';

const ScriptReader = ({ script, onClose }) => {
  const [voices, setVoices] = useState([]);
  const [characterVoices, setCharacterVoices] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // We keep rate for compatibility with the speakText function
  const [rate] = useState(1);
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
        console.log('Initializing speech synthesis...');

        if (!tts.isSupported()) {
          throw new Error('Speech synthesis is not supported in this browser');
        }

        // Wait a bit for voices to load
        setTimeout(() => {
          const availableVoices = tts.getVoices();
          console.log(`Got ${availableVoices.length} voices`);

          if (availableVoices.length === 0) {
            console.warn('No voices available, using default voice');
            setVoices([]);
          } else {
            setVoices(availableVoices);
          }

          // Auto-assign voices to characters
          const voiceAssignments = {};
          characters.forEach((character, index) => {
            // Try to find a voice that matches the character's language or name
            let voice = availableVoices.find(v =>
              v.name.toLowerCase().includes(character.toLowerCase())
            );

            // If no match by name, try to assign different voices to different characters
            if (!voice && availableVoices.length > 0) {
              voice = availableVoices[index % availableVoices.length];
            }

            voiceAssignments[character] = voice;
          });

          console.log('Voice assignments:', voiceAssignments);
          setCharacterVoices(voiceAssignments);

          setIsLoading(false);
        }, 500);
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
      tts.stop();
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

      // Stop any ongoing speech
      tts.stop();

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
          // Speak the text using our TTS service
          await tts.speak(line.line, {
            voice: voice,
            rate: rate,
            volume: volume
          });

          // Add a small pause between lines
          if (i < script.length - 1) { // Don't pause after the last line
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (lineError) {
          console.error(`Error speaking line ${i}:`, lineError);
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
      tts.stop(); // Make sure to stop any ongoing speech
    }
  };

  // Stop playback
  const stopPlayback = () => {
    tts.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
  };

  // Pause playback
  const pausePlayback = () => {
    // Note: Our simple TTS implementation doesn't support pause/resume
    // So we just stop playback
    tts.stop();
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
          <strong>Note:</strong> This feature uses your browser's text-to-speech capabilities.
        </p>
        <ol>
          <li>Make sure your device volume is turned up</li>
          <li>Each character will speak with their assigned voice</li>
          <li>If no speech is heard, try clicking the Play button again</li>
          <li>Some browsers may have limited text-to-speech support</li>
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
