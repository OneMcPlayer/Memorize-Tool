import React, { useState, useEffect, useRef } from 'react';
import openaiService from '../../services/openaiService';
import './SttTestComponent.css';

const SttTestComponent = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedText, setRecordedText] = useState('');
  const [status, setStatus] = useState('');
  const [testMode, setTestMode] = useState(true);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Force demo mode for testing
  useEffect(() => {
    // Set test mode to avoid using real API
    openaiService.isTestMode = testMode;
    openaiService.isDemoMode = testMode;

    // Log the current mode
    console.log('STT Test Component initialized with test mode:', testMode);

    return () => {
      // Clean up
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [testMode, isRecording]);

  // Start recording audio
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      setStatus('Requesting microphone access...');

      // If in test mode, simulate recording
      if (testMode) {
        setStatus('Recording in test mode (simulated)...');
        setIsRecording(true);

        // Simulate recording for 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Create a dummy audio blob
        const dummyBlob = new Blob(['dummy audio data'], { type: 'audio/webm' });
        setAudioBlob(dummyBlob);

        // Stop the simulated recording
        setIsRecording(false);
        setStatus('Recording completed (simulated)');

        return;
      }

      // Real recording logic (only used if testMode is false)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('Recording...');

      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setStatus('Recording completed');

        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && !testMode) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Process the recorded audio
  const processAudio = async () => {
    try {
      setStatus('Processing audio...');

      // Use the OpenAI service to convert speech to text
      const text = await openaiService.speechToText(audioBlob);

      setRecordedText(text);
      setStatus('Processing completed');
    } catch (error) {
      console.error('Error processing audio:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  // Toggle test mode
  const toggleTestMode = () => {
    setTestMode(!testMode);
    openaiService.isTestMode = !testMode;
    openaiService.isDemoMode = !testMode;
  };

  return (
    <div className="stt-test-component">
      <h1>Speech-to-Text Test</h1>

      <div className="test-controls">
        <div className="test-mode-toggle">
          <label>
            <input
              type="checkbox"
              checked={testMode}
              onChange={toggleTestMode}
            />
            Use Test Mode (No API Calls)
          </label>
          <p className="mode-info">
            {testMode
              ? "Test mode is ON. No real API calls will be made."
              : "Test mode is OFF. Real API calls may be made if an API key is set."}
          </p>
        </div>

        <div className="recording-controls">
          <button
            className={`record-button ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={status.includes('Processing')}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>

          <button
            className="process-button"
            onClick={processAudio}
            disabled={isRecording || !audioBlob}
          >
            Process Audio
          </button>
        </div>
      </div>

      <div className="status-display">
        <p>Status: {status}</p>
      </div>

      <div className="results-display">
        <h2>Transcription Result:</h2>
        <div className="transcription-box">
          {recordedText || 'No transcription yet'}
        </div>
      </div>

      <div className="info-panel">
        <h3>How This Works:</h3>
        <p>
          In test mode, this component simulates recording and uses the demo speech-to-text
          function that returns a predefined response without making any API calls.
        </p>
        <p>
          The demo function in <code>openaiService.js</code> returns:
          "I'm saying my line as expected. This is a demo response."
        </p>
      </div>
    </div>
  );
};

export default SttTestComponent;
