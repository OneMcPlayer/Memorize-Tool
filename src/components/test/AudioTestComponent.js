import React, { useState } from 'react';
import { testDirectAudio, testGoogleTTS, testAlternativeTTS, runAllTests } from '../../utils/audioTest';
import './AudioTestComponent.css';

const AudioTestComponent = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState('all');
  const [userInteracted, setUserInteracted] = useState(false);
  const [manualTestUrl, setManualTestUrl] = useState('');
  const [manualTestResult, setManualTestResult] = useState(null);

  // Run the selected test
  const runTest = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      let testResults;
      
      switch (selectedTest) {
        case 'direct':
          testResults = { directAudio: await testDirectAudio() };
          break;
        case 'google':
          testResults = { googleTTS: await testGoogleTTS() };
          break;
        case 'alternative':
          testResults = { alternativeTTS: await testAlternativeTTS() };
          break;
        case 'all':
        default:
          testResults = await runAllTests();
          break;
      }
      
      setResults(testResults);
    } catch (err) {
      console.error('Error running tests:', err);
      setResults({
        error: true,
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle user interaction to enable audio
  const handleUserInteraction = () => {
    setUserInteracted(true);
  };

  // Run a manual test with a custom URL
  const runManualTest = async () => {
    setManualTestResult(null);
    
    try {
      console.log('Running manual test with URL:', manualTestUrl);
      
      const audio = new Audio(manualTestUrl);
      
      audio.oncanplaythrough = () => {
        console.log('Manual test: Audio can play through');
      };
      
      audio.onplay = () => {
        console.log('Manual test: Audio playback started');
      };
      
      audio.onended = () => {
        console.log('Manual test: Audio playback ended');
        setManualTestResult({
          success: true,
          message: 'Manual audio test completed successfully'
        });
      };
      
      audio.onerror = (err) => {
        console.error('Manual test: Audio error:', err);
        setManualTestResult({
          success: false,
          error: 'Audio error event triggered',
          details: err.message || 'Unknown error'
        });
      };
      
      try {
        await audio.play();
        console.log('Manual test: Audio play() promise resolved');
      } catch (err) {
        console.error('Manual test: Audio play() promise rejected:', err);
        setManualTestResult({
          success: false,
          error: err.message,
          details: 'The browser rejected the play() request'
        });
      }
    } catch (err) {
      console.error('Error in manual test:', err);
      setManualTestResult({
        success: false,
        error: err.message,
        details: 'An unexpected error occurred during the manual test'
      });
    }
  };

  // Generate a Google TTS URL for testing
  const generateGoogleTtsUrl = () => {
    const text = prompt('Enter text to convert to speech:', 'This is a test of the Google Translate text to speech API');
    if (text) {
      const encodedText = encodeURIComponent(text);
      const lang = prompt('Enter language code:', 'en');
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${lang}&client=tw-ob`;
      setManualTestUrl(url);
    }
  };

  return (
    <div className="audio-test-component">
      <h1>Audio Playback Test</h1>
      
      {!userInteracted ? (
        <div className="user-interaction-prompt">
          <p>
            <strong>Note:</strong> Most browsers require user interaction before allowing audio playback.
          </p>
          <button 
            className="interaction-button"
            onClick={handleUserInteraction}
          >
            Click here to enable audio playback
          </button>
        </div>
      ) : (
        <>
          <div className="test-controls">
            <div className="test-selection">
              <label htmlFor="test-select">Select test to run:</label>
              <select 
                id="test-select"
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
              >
                <option value="all">All Tests</option>
                <option value="direct">Direct Audio Test</option>
                <option value="google">Google TTS Test</option>
                <option value="alternative">Alternative TTS Test</option>
              </select>
            </div>
            
            <button 
              className="run-button"
              onClick={runTest}
              disabled={loading}
            >
              {loading ? 'Running Tests...' : 'Run Test'}
            </button>
          </div>
          
          {results && (
            <div className="test-results">
              <h2>Test Results</h2>
              
              {results.error ? (
                <div className="error-result">
                  <h3>Error Running Tests</h3>
                  <p>{results.message}</p>
                </div>
              ) : (
                <div className="results-container">
                  {results.directAudio && (
                    <div className={`result-item ${results.directAudio.success ? 'success' : 'failure'}`}>
                      <h3>Direct Audio Test</h3>
                      {results.directAudio.success ? (
                        <p className="success-message">{results.directAudio.message}</p>
                      ) : (
                        <div className="error-details">
                          <p className="error-message">{results.directAudio.error}</p>
                          <p className="error-type">Type: {results.directAudio.errorType}</p>
                          <p className="error-details">{results.directAudio.details}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {results.googleTTS && (
                    <div className={`result-item ${results.googleTTS.success ? 'success' : 'failure'}`}>
                      <h3>Google TTS Test</h3>
                      {results.googleTTS.success ? (
                        <p className="success-message">{results.googleTTS.message}</p>
                      ) : (
                        <div className="error-details">
                          <p className="error-message">{results.googleTTS.error}</p>
                          <p className="error-type">Type: {results.googleTTS.errorType}</p>
                          <p className="error-details">{results.googleTTS.details}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {results.alternativeTTS && (
                    <div className={`result-item ${results.alternativeTTS.success ? 'success' : 'failure'}`}>
                      <h3>Alternative TTS Test</h3>
                      {results.alternativeTTS.success ? (
                        <p className="success-message">{results.alternativeTTS.message}</p>
                      ) : (
                        <div className="error-details">
                          <p className="error-message">{results.alternativeTTS.error}</p>
                          <p className="error-type">Type: {results.alternativeTTS.errorType}</p>
                          <p className="error-details">{results.alternativeTTS.details}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="manual-test-section">
            <h2>Manual Audio Test</h2>
            <p>Test audio playback with a custom URL:</p>
            
            <div className="manual-test-controls">
              <input 
                type="text"
                value={manualTestUrl}
                onChange={(e) => setManualTestUrl(e.target.value)}
                placeholder="Enter audio URL to test"
                className="url-input"
              />
              
              <button 
                className="generate-button"
                onClick={generateGoogleTtsUrl}
              >
                Generate Google TTS URL
              </button>
              
              <button 
                className="run-button"
                onClick={runManualTest}
                disabled={!manualTestUrl}
              >
                Test URL
              </button>
            </div>
            
            {manualTestResult && (
              <div className={`manual-result ${manualTestResult.success ? 'success' : 'failure'}`}>
                <h3>Manual Test Result</h3>
                {manualTestResult.success ? (
                  <p className="success-message">{manualTestResult.message}</p>
                ) : (
                  <div className="error-details">
                    <p className="error-message">{manualTestResult.error}</p>
                    <p className="error-details">{manualTestResult.details}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="browser-info">
            <h2>Browser Information</h2>
            <p><strong>User Agent:</strong> {navigator.userAgent}</p>
            <p><strong>Audio Context Support:</strong> {typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined' ? 'Yes' : 'No'}</p>
            <p><strong>Speech Synthesis Support:</strong> {typeof window.speechSynthesis !== 'undefined' ? 'Yes' : 'No'}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default AudioTestComponent;
