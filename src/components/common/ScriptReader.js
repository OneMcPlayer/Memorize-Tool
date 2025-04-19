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
        if (!isSpeechSynthesisSupported()) {
          throw new Error('Speech synthesis is not supported in this browser');
        }

        const availableVoices = await getAvailableVoices();
        setVoices(availableVoices);

        // Auto-assign voices to characters
        const voiceAssignments = assignVoicesToCharacters(characters, availableVoices);
        setCharacterVoices(voiceAssignments);

        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    loadVoices();

    // Clean up speech synthesis when component unmounts
    return () => {
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
    setIsPlaying(true);
    setIsPaused(false);

    // Start from the beginning if not already playing
    if (currentLineIndex === -1) {
      setCurrentLineIndex(0);
    }

    // Play from current line to the end
    for (let i = Math.max(0, currentLineIndex); i < script.length; i++) {
      if (!isPlaying) break; // Stop if play was cancelled

      setCurrentLineIndex(i);
      const line = script[i];
      const voice = characterVoices[line.speaker];

      // Only speak the dialogue, not the speaker name
      try {
        await speakText(line.line, voice, rate, pitch, volume);
      } catch (err) {
        setError(err.message);
        break;
      }
    }

    // Reset when finished
    setIsPlaying(false);
    setCurrentLineIndex(-1);
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
    return <div className="script-reader error">Error: {error}</div>;
  }

  return (
    <div className="script-reader">
      <h2>Script Reader</h2>

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
