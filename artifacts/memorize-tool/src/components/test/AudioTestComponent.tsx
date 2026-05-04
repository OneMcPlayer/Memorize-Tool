import React, { useState, useEffect } from 'react';
import ttsService from '../../utils/ttsService';

const AudioTestComponent = () => {
  const [userInteracted, setUserInteracted] = useState(false);
  const [ttsStatus, setTtsStatus] = useState({
    webSpeechAvailable: false,
    voices: [] as SpeechSynthesisVoice[]
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const webSpeechAvailable = 'speechSynthesis' in window;
    let voices: SpeechSynthesisVoice[] = [];

    if (webSpeechAvailable) {
      voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          setTtsStatus({ webSpeechAvailable, voices: window.speechSynthesis.getVoices() });
        };
      }
    }

    setTtsStatus({ webSpeechAvailable, voices });
  }, []);

  const handleUserInteraction = () => {
    setUserInteracted(true);
    ttsService.userInteracted = true;
  };

  const runTest = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      await ttsService.speak('This is a test of the text-to-speech service.', { lang: 'en-US' });
      setTestResult({ success: true, message: 'TTS test completed successfully!' });
    } catch (err) {
      setTestResult({ success: false, message: `TTS test failed: ${(err as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Audio Playback Test</h1>

      {!userInteracted ? (
        <div style={{ background: '#fff3e0', border: '1px solid #ff9800', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <p><strong>Note:</strong> Most browsers require user interaction before allowing audio playback.</p>
          <button onClick={handleUserInteraction} style={{ background: '#ff9800' }}>
            Click here to enable audio playback
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '20px' }}>
            <button onClick={runTest} disabled={loading}>
              {loading ? 'Testing...' : 'Run TTS Test'}
            </button>
          </div>

          {testResult && (
            <div style={{
              padding: '15px',
              borderRadius: '8px',
              background: testResult.success ? '#e8f5e9' : '#ffebee',
              color: testResult.success ? '#2e7d32' : '#c62828',
              marginBottom: '20px'
            }}>
              {testResult.message}
            </div>
          )}

          <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
            <h2>Browser Information</h2>
            <p><strong>Speech Synthesis Support:</strong> {ttsStatus.webSpeechAvailable ? 'Yes' : 'No'}</p>
            <p><strong>Available Voices:</strong> {ttsStatus.voices.length}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default AudioTestComponent;
