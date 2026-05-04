import React, { useState, useEffect, useMemo } from 'react';
import ttsService from '../../utils/ttsService';

interface ScriptLine {
  speaker: string;
  line: string;
}

interface Voice {
  lang: string;
  name: string;
}

interface ScriptReaderProps {
  script: ScriptLine[];
  onClose: () => void;
}

const ScriptReader = ({ script, onClose }: ScriptReaderProps) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [characterVoices, setCharacterVoices] = useState<Record<string, Voice | null>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);

  const characters = useMemo(() => {
    return [...new Set(script.map(line => line.speaker))];
  }, [script]);

  useEffect(() => {
    try {
      setIsLoading(true);

      ttsService.updateConfig({ useWebSpeech: true, useGoogleTTS: true });

      if (!ttsService.isAvailable()) {
        throw new Error('Text-to-speech is not supported in this browser');
      }

      const availableVoices = ttsService.getVoices();

      if (availableVoices.length === 0 && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
          const updatedVoices = window.speechSynthesis.getVoices();
          processVoices(updatedVoices);
        };
      } else {
        processVoices(availableVoices);
      }
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }

    function processVoices(availableVoices: Voice[]) {
      try {
        if (availableVoices.length > 0) {
          setVoices(availableVoices);

          const voicesByLang: Record<string, Voice[]> = {};
          availableVoices.forEach(voice => {
            const langCode = voice.lang.split('-')[0];
            if (!voicesByLang[langCode]) voicesByLang[langCode] = [];
            voicesByLang[langCode].push(voice);
          });

          const voiceAssignments: Record<string, Voice> = {};
          characters.forEach((character, index) => {
            const langCodes = Object.keys(voicesByLang);
            const langCode = langCodes[index % langCodes.length];
            const langVoices = voicesByLang[langCode];
            voiceAssignments[character] = langVoices[index % langVoices.length];
          });

          setCharacterVoices(voiceAssignments);
        } else {
          const languagePreferences: Voice[] = [
            { lang: 'en-US', name: 'English (US)' },
            { lang: 'en-GB', name: 'English (UK)' },
            { lang: 'it-IT', name: 'Italian' },
            { lang: 'fr-FR', name: 'French' },
            { lang: 'de-DE', name: 'German' },
            { lang: 'es-ES', name: 'Spanish' },
          ];

          setVoices(languagePreferences);

          const voiceAssignments: Record<string, Voice> = {};
          characters.forEach((character, index) => {
            voiceAssignments[character] = languagePreferences[index % languagePreferences.length];
          });

          setCharacterVoices(voiceAssignments);
        }

        setIsLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setIsLoading(false);
      }
    }

    return () => {
      ttsService.stop();
    };
  }, [characters]);

  const handleVoiceChange = (character: string, langCode: string) => {
    const selectedVoice = voices.find(voice => voice.lang === langCode) || null;
    setCharacterVoices(prev => ({ ...prev, [character]: selectedVoice }));
  };

  const playScript = async () => {
    try {
      setIsPlaying(true);
      setIsPaused(false);
      setError(null);

      if (currentLineIndex === -1) setCurrentLineIndex(0);

      ttsService.stop();

      for (let i = Math.max(0, currentLineIndex); i < script.length; i++) {
        if (!isPlaying && i > 0) break;

        setCurrentLineIndex(i);
        const line = script[i];
        const voice = characterVoices[line.speaker];

        try {
          await ttsService.speak(line.line, {
            voice: voice as SpeechSynthesisVoice,
            volume,
            rate,
            pitch
          });

          if (i < script.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (lineError) {
          console.error(`Error playing line ${i}:`, lineError);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setIsPlaying(false);
      setCurrentLineIndex(-1);
    } catch (err) {
      setError(`Error during playback: ${(err as Error).message}`);
      setIsPlaying(false);
      ttsService.stop();
    }
  };

  const stopPlayback = () => {
    ttsService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
  };

  const pausePlayback = () => {
    ttsService.stop();
    setIsPaused(true);
  };

  const resumePlayback = () => {
    setIsPaused(false);
    playScript();
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
          Speech synthesis may not be fully supported in your browser. Try Chrome or Edge.
        </p>
        <button onClick={onClose} className="script-reader-close">Close</button>
      </div>
    );
  }

  return (
    <div className="script-reader">
      <h2>Script Reader</h2>
      <button onClick={onClose} className="script-reader-close">Close</button>

      <div className="script-reader-content">
        <div className="user-interaction-notice">
          <p><strong>Note:</strong> This feature uses your browser's speech synthesis capabilities.</p>
          <ol>
            <li>Make sure your device volume is turned up</li>
            <li>Each character will speak in their assigned language</li>
            <li>You can change a character's language using the dropdown</li>
            <li>If audio doesn't play, try clicking the Play button again</li>
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
              <input id="volume" type="range" min="0" max="1" step="0.1" value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))} />
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <div className="setting">
              <label htmlFor="rate">Speed:</label>
              <input id="rate" type="range" min="0.5" max="2" step="0.1" value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))} />
              <span>{rate.toFixed(1)}x</span>
            </div>
            <div className="setting">
              <label htmlFor="pitch">Pitch:</label>
              <input id="pitch" type="range" min="0.5" max="2" step="0.1" value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))} />
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
            <button onClick={isPaused ? resumePlayback : playScript} className="play-button"
              data-test="play-button">
              {isPaused ? 'Resume' : 'Play'}
            </button>
          ) : (
            <button onClick={pausePlayback} className="pause-button" data-test="pause-button">
              Pause
            </button>
          )}
          <button onClick={stopPlayback} className="stop-button" data-test="stop-button"
            disabled={!isPlaying && currentLineIndex === -1}>
            Stop
          </button>
        </div>
        <p className="note">Voice quality depends on your browser and operating system.</p>
      </div>
    </div>
  );
};

export default ScriptReader;
