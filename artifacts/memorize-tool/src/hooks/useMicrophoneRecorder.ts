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

export interface RecorderTrackSnapshot {
  enabled: boolean | null;
  kind: string;
  muted: boolean | null;
  readyState: string;
}

export interface RecordingMetadata {
  bytes: number;
  chunkCount: number;
  durationMs: number;
  mimeType: string;
  recorderState: string;
  streamActive: boolean;
  trackCount: number;
  trackStates: RecorderTrackSnapshot[];
}

export interface RecordingResult {
  blob: Blob;
  metadata: RecordingMetadata;
}

interface UseMicrophoneRecorderResult {
  isSupported: boolean;
  hasPermission: boolean;
  isRecording: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingResult | null>;
  cancelRecording: () => void;
  releaseStream: () => void;
  getRecorderSnapshot: () => RecordingMetadata;
}

const nowMs = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const getAudioTracks = (stream: MediaStream): MediaStreamTrack[] => {
  if (typeof stream.getAudioTracks === "function") {
    return stream.getAudioTracks();
  }
  return stream
    .getTracks()
    .filter((track) => !track.kind || track.kind === "audio");
};

const isLiveTrack = (track: MediaStreamTrack): boolean =>
  track.readyState !== "ended" && track.enabled !== false;

const streamHasLiveAudioTrack = (stream: MediaStream): boolean =>
  getAudioTracks(stream).some(isLiveTrack);

const snapshotTracks = (stream: MediaStream | null): RecorderTrackSnapshot[] => {
  if (!stream) return [];
  return stream.getTracks().map((track) => ({
    enabled:
      typeof track.enabled === "boolean" ? track.enabled : null,
    kind: track.kind || "unknown",
    muted:
      "muted" in track && typeof track.muted === "boolean"
        ? track.muted
        : null,
    readyState: track.readyState || "unknown",
  }));
};

const useMicrophoneRecorder = (): UseMicrophoneRecorderResult => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);

  const isSupported = hasNavigatorMediaDevices() && hasMediaRecorder();

  const releaseStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    recordingStartedAtRef.current = null;
  }, []);

  const getRecorderSnapshot = useCallback(
    (blob?: Blob | null, stoppedAtMs = nowMs()): RecordingMetadata => {
      const stream = mediaStreamRef.current;
      const recorder = mediaRecorderRef.current;
      const bytes =
        blob?.size ??
        chunksRef.current.reduce((total, chunk) => total + chunk.size, 0);
      const startedAt = recordingStartedAtRef.current;
      const trackStates = snapshotTracks(stream);
      return {
        bytes,
        chunkCount: chunksRef.current.length,
        durationMs:
          startedAt === null ? 0 : Math.max(0, Math.round(stoppedAtMs - startedAt)),
        mimeType:
          blob?.type || recorder?.mimeType || getPreferredMimeType() || "unknown",
        recorderState: recorder?.state ?? "missing",
        streamActive: Boolean(stream && streamHasLiveAudioTrack(stream)),
        trackCount: trackStates.length,
        trackStates,
      };
    },
    [],
  );

  const ensureActiveStream = useCallback(async (): Promise<MediaStream> => {
    const existingStream = mediaStreamRef.current;
    if (existingStream && streamHasLiveAudioTrack(existingStream)) {
      return existingStream;
    }

    if (existingStream) releaseStream();

    const stream = await navigator.mediaDevices.getUserMedia(
      getPreferredAudioConstraints(),
    );
    if (!streamHasLiveAudioTrack(stream)) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("Microphone stream is not active");
    }

    mediaStreamRef.current = stream;
    setHasPermission(true);
    setError(null);
    return stream;
  }, [releaseStream]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Microphone is not supported in this browser");
      return false;
    }
    try {
      await ensureActiveStream();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone permission denied");
      setHasPermission(false);
      releaseStream();
      return false;
    }
  }, [ensureActiveStream, isSupported, releaseStream]);

  const startRecording = useCallback(async (): Promise<void> => {
    if (!isSupported) throw new Error("Microphone is not supported in this browser");
    const stream = await ensureActiveStream();
    try {
      const preferredMimeType = getPreferredMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recordingStartedAtRef.current = null;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = recorder;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        let startTimeoutId: ReturnType<typeof setTimeout> | null = null;

        const settle = (fn: () => void) => {
          if (settled) return;
          settled = true;
          if (startTimeoutId !== null) clearTimeout(startTimeoutId);
          fn();
        };

        const markStarted = () => {
          recordingStartedAtRef.current = nowMs();
          setIsRecording(true);
          setError(null);
          settle(resolve);
        };

        recorder.onerror = (event) => {
          const e = event as Event & { error?: Error };
          const message = e.error?.message ?? "Microphone recording error";
          setError(message);
          settle(() => reject(e.error ?? new Error(message)));
        };
        recorder.onstart = markStarted;
        recorder.onstop = () => {
          setIsRecording(false);
          recordingStartedAtRef.current = null;
        };

        try {
          recorder.start(250);
        } catch (err) {
          settle(() => reject(err instanceof Error ? err : new Error(String(err))));
          return;
        }

        startTimeoutId = setTimeout(() => {
          if (recorder.state === "recording") {
            markStarted();
          } else {
            settle(() => reject(new Error("Microphone did not start recording")));
          }
        }, 1000);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
      if (mediaRecorderRef.current?.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore cleanup errors
        }
      }
      mediaRecorderRef.current = null;
      recordingStartedAtRef.current = null;
      throw err;
    }
  }, [ensureActiveStream, isSupported]);

  const stopRecording = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      const finalize = () => {
        try {
          const stoppedAt = nowMs();
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || getPreferredMimeType() || "audio/webm",
          });
          const metadata = getRecorderSnapshot(blob, stoppedAt);
          chunksRef.current = [];
          recordingStartedAtRef.current = null;
          resolve({ blob, metadata });
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
      try {
        recorder.requestData();
      } catch {
        // Some browsers throw if data is not ready yet; stop still flushes.
      }
      recorder.stop();
    });
  }, [getRecorderSnapshot]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        setIsRecording(false);
        recordingStartedAtRef.current = null;
      };
      recorder.stop();
    }
    chunksRef.current = [];
    recordingStartedAtRef.current = null;
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
    getRecorderSnapshot,
  };
};

export default useMicrophoneRecorder;
