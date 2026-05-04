import React, { useState, useEffect } from 'react';
import ttsService from '../../utils/ttsService';

const TtsTestPage = () => {
  const [text, setText] = useState('This is a test of the text-to-speech functionality.');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const available = window.speechSynthesis.getVoices();
        if (available.length > 0) {
          setVoices(available);
          setSelectedVoice(available[0]);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handlePlay = async () => {
    try {
      setStatus('Playing...');
      setIsPlaying(true);
      await ttsService.speak(text, { voice: selectedVoice as SpeechSynthesisVoice, volume, rate, pitch });
      setStatus('Playback completed successfully');
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    ttsService.stop();
    setIsPlaying(false);
    setStatus('Playback stopped');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Text-to-Speech Test</h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Text:</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to speak..." rows={4} disabled={isPlaying}
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }} />
      </div>

      {voices.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Voice:</label>
          <select value={selectedVoice?.name || ''}
            onChange={(e) => setSelectedVoice(voices.find(v => v.name === e.target.value) || null)}
            disabled={isPlaying} style={{ width: '100%', padding: '8px' }}>
            {voices.map(voice => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <label>Volume: {volume.toFixed(1)}</label>
        <input type="range" min="0" max="1" step="0.1" value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))} disabled={isPlaying}
          style={{ width: '100%' }} />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>Rate: {rate.toFixed(1)}</label>
        <input type="range" min="0.5" max="2" step="0.1" value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value))} disabled={isPlaying}
          style={{ width: '100%' }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>Pitch: {pitch.toFixed(1)}</label>
        <input type="range" min="0.5" max="2" step="0.1" value={pitch}
          onChange={(e) => setPitch(parseFloat(e.target.value))} disabled={isPlaying}
          style={{ width: '100%' }} />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={handlePlay} disabled={isPlaying || !text.trim()}
          style={{ background: '#4caf50', color: 'white' }}>Play</button>
        <button onClick={handleStop} disabled={!isPlaying}
          style={{ background: '#f44336', color: 'white' }}>Stop</button>
      </div>

      {status && (
        <div style={{
          padding: '10px 15px',
          borderRadius: '4px',
          background: status.includes('Error') ? '#ffebee' : '#e8f5e9',
          color: status.includes('Error') ? '#c62828' : '#2e7d32'
        }}>
          {status}
        </div>
      )}
    </div>
  );
};

export default TtsTestPage;
