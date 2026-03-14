import { useState, useRef, useCallback, useEffect } from 'react';

const hasNavigatorMediaDevices = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices;
const hasMediaRecorder = () => typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';
const preferredAudioConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 44100
  }
};

export const getPreferredAudioConstraints = () => preferredAudioConstraints;

export const getPreferredMimeType = () => {
  if (!hasMediaRecorder() || typeof window.MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  const preferredTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4'
  ];

  return preferredTypes.find(type => window.MediaRecorder.isTypeSupported(type)) || '';
};

const useMicrophoneRecorder = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const isSupported = hasNavigatorMediaDevices() && hasMediaRecorder();

  const releaseStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError('Microphone is not supported in this browser');
      return false;
    }

    if (hasPermission && mediaStreamRef.current) {
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(getPreferredAudioConstraints());
      mediaStreamRef.current = stream;
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      setError(err.message || 'Microphone permission denied');
      setHasPermission(false);
      releaseStream();
      return false;
    }
  }, [hasPermission, isSupported, releaseStream]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Microphone is not supported in this browser');
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        throw new Error('Microphone permission is required');
      }
    }

    if (!mediaStreamRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia(getPreferredAudioConstraints());
      mediaStreamRef.current = stream;
    }

    try {
      const preferredMimeType = getPreferredMimeType();
      const recorderOptions = preferredMimeType ? { mimeType: preferredMimeType } : undefined;
      const recorder = recorderOptions
        ? new MediaRecorder(mediaStreamRef.current, recorderOptions)
        : new MediaRecorder(mediaStreamRef.current);

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        const message = event.error ? event.error.message : 'Microphone recording error';
        setError(message);
      };

      recorder.onstart = () => {
        setIsRecording(true);
        setError(null);
      };

      recorder.onstop = () => {
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (err) {
      setError(err.message || 'Failed to start recording');
      throw err;
    }
  }, [hasPermission, isSupported, requestPermission]);

  const stopRecording = useCallback(() => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder) {
        resolve(null);
        return;
      }

      if (recorder.state === 'inactive') {
        resolve(null);
        return;
      }

      const finalize = () => {
        try {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || getPreferredMimeType() || 'audio/webm'
          });
          chunksRef.current = [];
          resolve(blob);
        } catch (err) {
          reject(err);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        finalize();
      };

      recorder.onerror = (event) => {
        const message = event.error ? event.error.message : 'Microphone recording error';
        setError(message);
        reject(event.error || new Error(message));
      };

      recorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      cancelRecording();
      releaseStream();
    };
  }, [cancelRecording, releaseStream]);

  return {
    isSupported,
    hasPermission,
    isRecording,
    error,
    requestPermission,
    startRecording,
    stopRecording,
    cancelRecording,
    releaseStream
  };
};

export default useMicrophoneRecorder;
