import React, { useState, useEffect } from 'react';
import ttsService from '../../utils/ttsService';
import './TtsTestPage.css';

const TtsTestPage = () => {
  const [text, setText] = useState('This is a test of the text-to-speech functionality.');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('');
  const [config, setConfig] = useState({
    useWebSpeech: true,
    useGoogleTTS: true,
    useProxy: false
  });

  // Initialize voices when component mounts
  useEffect(() => {
    // Check if Web Speech API is available
    if ('speechSynthesis' in window) {
      // Get available voices
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
          // Set a default voice
          setSelectedVoice(availableVoices[0]);
        }
      };

      // Load voices
      loadVoices();

      // Chrome loads voices asynchronously
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Initialize config from TTS service
    setConfig({
      useWebSpeech: ttsService.config.useWebSpeech,
      useGoogleTTS: ttsService.config.useGoogleTTS,
      useProxy: ttsService.config.useProxy
    });

    // Cleanup
    return () => {
      if (isPlaying) {
        ttsService.stop();
      }
    };
  }, [isPlaying]);

  // Handle play button click
  const handlePlay = async () => {
    try {
      setStatus('Playing...');
      setIsPlaying(true);

      // Update TTS service config
      ttsService.updateConfig(config);

      // Speak the text
      await ttsService.speak(text, {
        voice: selectedVoice,
        volume,
        rate,
        pitch
      });

      setStatus('Playback completed successfully');
    } catch (error) {
      console.error('TTS error:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsPlaying(false);
    }
  };

  // Handle stop button click
  const handleStop = () => {
    ttsService.stop();
    setIsPlaying(false);
    setStatus('Playback stopped');
  };

  // Handle config change
  const handleConfigChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="tts-test-page">
      <h1>Text-to-Speech Test</h1>

      <div className="test-description">
        <p>
          This page allows you to test the text-to-speech functionality with different settings.
          You can choose between the Web Speech API and Google Translate TTS.
        </p>
      </div>

      <div className="config-section">
        <h2>TTS Configuration</h2>
        <div className="config-options">
          <label>
            <input
              type="checkbox"
              checked={config.useWebSpeech}
              onChange={(e) => handleConfigChange('useWebSpeech', e.target.checked)}
            />
            Use Web Speech API
          </label>

          <label>
            <input
              type="checkbox"
              checked={config.useGoogleTTS}
              onChange={(e) => handleConfigChange('useGoogleTTS', e.target.checked)}
            />
            Use Google TTS (fallback)
          </label>

          <label>
            <input
              type="checkbox"
              checked={config.useProxy}
              onChange={(e) => handleConfigChange('useProxy', e.target.checked)}
            />
            Use Proxy for Google TTS (helps with CORS issues)
          </label>
        </div>
      </div>

      <div className="input-section">
        <h2>Text Input</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to speak..."
          rows={4}
          disabled={isPlaying}
        />
      </div>

      <div className="voice-section">
        <h2>Voice Settings</h2>

        <div className="voice-selector">
          <label htmlFor="voice-select">Voice:</label>
          <select
            id="voice-select"
            value={selectedVoice?.name || ''}
            onChange={(e) => {
              const voice = voices.find(v => v.name === e.target.value);
              setSelectedVoice(voice);
            }}
            disabled={!voices.length || isPlaying}
          >
            {voices.length === 0 ? (
              <option value="">No voices available</option>
            ) : (
              voices.map(voice => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="voice-controls">
          <div className="control">
            <label htmlFor="volume">Volume: {volume.toFixed(1)}</label>
            <input
              id="volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              disabled={isPlaying}
            />
          </div>

          <div className="control">
            <label htmlFor="rate">Rate: {rate.toFixed(1)}</label>
            <input
              id="rate"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              disabled={isPlaying}
            />
          </div>

          <div className="control">
            <label htmlFor="pitch">Pitch: {pitch.toFixed(1)}</label>
            <input
              id="pitch"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              disabled={isPlaying}
            />
          </div>
        </div>
      </div>

      <div className="playback-controls">
        <button
          className="play-button"
          onClick={handlePlay}
          disabled={isPlaying || !text.trim()}
        >
          Play
        </button>

        <button
          className="stop-button"
          onClick={handleStop}
          disabled={!isPlaying}
        >
          Stop
        </button>
      </div>

      {status && (
        <div className={`status ${status.includes('Error') ? 'error' : ''}`}>
          {status}
        </div>
      )}

      <div className="browser-info">
        <h2>Browser Information</h2>
        <p><strong>Web Speech API Support:</strong> {'speechSynthesis' in window ? 'Yes' : 'No'}</p>
        <p><strong>Available Voices:</strong> {voices.length}</p>
        <p><strong>User Agent:</strong> {navigator.userAgent}</p>
      </div>
    </div>
  );
};

export default TtsTestPage;
