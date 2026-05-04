import { useState, useRef, useCallback, useEffect } from "react";

const hasNavigatorMediaDevices = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices;
const hasMediaRecorder = () =>
  typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined";

const preferredAudioConstraints: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 44100,
  },
};

export const getPreferredAudioConstraints = () => preferredAudioConstraints;

export const getPreferredMimeType = (): string => {
  if (!hasMediaRecorder() || typeof window.MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return preferredTypes.find((t) => window.MediaRecorder.isTypeSupported(t)) ?? "";
};

interface UseMicrophoneRecorderResult {
  isSupported: boolean;
  hasPermission: boolean;
  isRecording: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => void;
  releaseStream: () => void;
}

const useMicrophoneRecorder = (): UseMicrophoneRecorderResult => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isSupported = hasNavigatorMediaDevices() && hasMediaRecorder();

  const releaseStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Microphone is not supported in this browser");
      return false;
    }
    if (hasPermission && mediaStreamRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getPreferredAudioConstraints());
      mediaStreamRef.current = stream;
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone permission denied");
      setHasPermission(false);
      releaseStream();
      return false;
    }
  }, [hasPermission, isSupported, releaseStream]);

  const startRecording = useCallback(async (): Promise<void> => {
    if (!isSupported) throw new Error("Microphone is not supported in this browser");
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) throw new Error("Microphone permission is required");
    }
    if (!mediaStreamRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia(getPreferredAudioConstraints());
      mediaStreamRef.current = stream;
    }
    try {
      const preferredMimeType = getPreferredMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(mediaStreamRef.current, { mimeType: preferredMimeType })
        : new MediaRecorder(mediaStreamRef.current);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = (event) => {
        const e = event as Event & { error?: Error };
        setError(e.error?.message ?? "Microphone recording error");
      };
      recorder.onstart = () => {
        setIsRecording(true);
        setError(null);
      };
      recorder.onstop = () => setIsRecording(false);
      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
      throw err;
    }
  }, [hasPermission, isSupported, requestPermission]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      const finalize = () => {
        try {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || getPreferredMimeType() || "audio/webm",
          });
          chunksRef.current = [];
          resolve(blob);
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      };
      recorder.onstop = () => {
        setIsRecording(false);
        finalize();
      };
      recorder.onerror = (event) => {
        const e = event as Event & { error?: Error };
        const message = e.error?.message ?? "Microphone recording error";
        setError(message);
        reject(e.error ?? new Error(message));
      };
      recorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
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
    releaseStream,
  };
};

export default useMicrophoneRecorder;
