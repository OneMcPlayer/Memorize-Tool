import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Play, Square, Trash2, Upload } from "lucide-react";
import useMicrophoneRecorder, {
  type RecordingMetadata,
} from "../../hooks/useMicrophoneRecorder";
import { clearAccessToken, withAccessTokenHeader } from "../../lib/accessToken";
import "./SttPerformanceTestPage.css";

type SttTargetId = "whisper-large-v3" | "gemini-3.1-flash";
type RunStatus = "idle" | "running" | "success" | "error";

interface TargetConfig {
  id: SttTargetId;
  label: string;
  defaultModel: string;
  endpointLabel: string;
}

interface SttPerformanceResult {
  target: SttTargetId;
  model: string;
  endpoint: string;
  text: string;
  usage?: Record<string, unknown>;
  generationId?: string;
  durationMs: number;
  clientDurationMs: number;
  input: {
    format: string;
    mimeType: string;
    sizeBytes: number;
  };
}

interface RunState {
  error?: string;
  result?: SttPerformanceResult;
  status: RunStatus;
}

const TARGETS: TargetConfig[] = [
  {
    id: "whisper-large-v3",
    label: "Whisper large-v3",
    defaultModel: "openai/whisper-large-v3",
    endpointLabel: "STT endpoint",
  },
  {
    id: "gemini-3.1-flash",
    label: "Gemini 3.1 Flash",
    defaultModel: "google/gemini-3.1-flash-lite-preview",
    endpointLabel: "Audio-input chat",
  },
];

const DEFAULT_PROMPT =
  "Transcribe the spoken words exactly. Return only the transcript text.";

const emptyRunState = (): Record<SttTargetId, RunState> => ({
  "whisper-large-v3": { status: "idle" },
  "gemini-3.1-flash": { status: "idle" },
});

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const formatMs = (ms: number | undefined): string =>
  typeof ms === "number" ? `${Math.round(ms).toLocaleString()} ms` : "n/a";

const summarizeUsage = (usage: Record<string, unknown> | undefined): string => {
  if (!usage) return "n/a";
  const preferred = [
    "seconds",
    "cost",
    "total_tokens",
    "input_tokens",
    "output_tokens",
  ];
  const parts = preferred
    .filter((key) => key in usage)
    .map((key) => `${key}: ${String(usage[key])}`);
  if (parts.length > 0) return parts.join(" | ");
  return Object.entries(usage)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" | ");
};

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as {
      details?: string;
      error?: string | { message?: string };
    };
    if (typeof data.error === "string") return data.error;
    return data.error?.message ?? data.details ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

const SttPerformanceTestPage = () => {
  const recorder = useMicrophoneRecorder();
  const audioUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState("No audio selected");
  const [recordingMetadata, setRecordingMetadata] =
    useState<RecordingMetadata | null>(null);
  const [language, setLanguage] = useState("en");
  const [models, setModels] = useState<Record<SttTargetId, string>>({
    "whisper-large-v3": TARGETS[0].defaultModel,
    "gemini-3.1-flash": TARGETS[1].defaultModel,
  });
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [runs, setRuns] =
    useState<Record<SttTargetId, RunState>>(emptyRunState);
  const [isRunning, setIsRunning] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const audioDetails = useMemo(() => {
    if (!audioBlob) return null;
    return {
      size: formatBytes(audioBlob.size),
      type: audioBlob.type || "unknown",
      duration:
        recordingMetadata && recordingMetadata.durationMs > 0
          ? formatMs(recordingMetadata.durationMs)
          : "file input",
    };
  }, [audioBlob, recordingMetadata]);

  const comparisonDelta = useMemo(() => {
    const whisper = runs["whisper-large-v3"].result;
    const gemini = runs["gemini-3.1-flash"].result;
    if (!whisper || !gemini) return null;
    const diff = Math.abs(whisper.durationMs - gemini.durationMs);
    if (diff < 25) return "Server timings are effectively tied.";
    const faster =
      whisper.durationMs < gemini.durationMs
        ? "Whisper large-v3"
        : "Gemini 3.1 Flash";
    return `${faster} was faster by ${formatMs(diff)} server-side.`;
  }, [runs]);

  const replaceAudio = (
    blob: Blob,
    name: string,
    metadata: RecordingMetadata | null,
  ) => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    const nextUrl = URL.createObjectURL(blob);
    audioUrlRef.current = nextUrl;
    setAudioBlob(blob);
    setAudioUrl(nextUrl);
    setAudioName(name);
    setRecordingMetadata(metadata);
    setRuns(emptyRunState());
    setPageError(null);
  };

  const clearAudio = () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioName("No audio selected");
    setRecordingMetadata(null);
    setRuns(emptyRunState());
    setPageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    replaceAudio(file, file.name, null);
  };

  const handleRecordingToggle = async () => {
    setPageError(null);
    if (recorder.isRecording) {
      const result = await recorder.stopRecording();
      if (result) {
        replaceAudio(
          result.blob,
          `Recording ${new Date().toLocaleTimeString()}`,
          result.metadata,
        );
      }
      return;
    }

    const ready =
      recorder.hasPermission || (await recorder.requestPermission());
    if (!ready) return;
    await recorder.startRecording();
  };

  const runTarget = async (
    target: TargetConfig,
  ): Promise<SttPerformanceResult> => {
    if (!audioBlob) throw new Error("Audio is required");

    const formData = new FormData();
    formData.append("target", target.id);
    formData.append("model", models[target.id].trim());
    if (language.trim()) formData.append("language", language.trim());
    if (target.id === "gemini-3.1-flash" && prompt.trim()) {
      formData.append("prompt", prompt.trim());
    }
    formData.append("file", audioBlob, audioName || "sample.webm");

    const startedAt = performance.now();
    const response = await fetch("/api/audio/stt-performance", {
      method: "POST",
      headers: withAccessTokenHeader(),
      body: formData,
    });
    const clientDurationMs = performance.now() - startedAt;

    if (response.status === 401) {
      clearAccessToken();
      throw new Error("Access token is missing or expired.");
    }

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const result = (await response.json()) as Omit<
      SttPerformanceResult,
      "clientDurationMs"
    >;
    return { ...result, clientDurationMs };
  };

  const runComparison = async () => {
    if (!audioBlob) {
      setPageError("Choose or record an audio sample first.");
      return;
    }

    setIsRunning(true);
    setPageError(null);
    setRuns({
      "whisper-large-v3": { status: "running" },
      "gemini-3.1-flash": { status: "running" },
    });

    await Promise.all(
      TARGETS.map(async (target) => {
        try {
          const result = await runTarget(target);
          setRuns((current) => ({
            ...current,
            [target.id]: { result, status: "success" },
          }));
        } catch (err) {
          setRuns((current) => ({
            ...current,
            [target.id]: {
              error: err instanceof Error ? err.message : String(err),
              status: "error",
            },
          }));
        }
      }),
    );
    setIsRunning(false);
  };

  const updateModel = (target: SttTargetId, value: string) => {
    setModels((current) => ({ ...current, [target]: value }));
  };

  return (
    <div className="stt-performance-page">
      <h1>Speech-to-Text Performance</h1>
      <p className="stt-performance-summary">
        Compare one audio sample against Whisper large-v3 and Gemini 3.1 Flash
        with server timing, browser round trip, provider usage, and transcripts.
      </p>

      <section className="stt-performance-controls">
        <h2>Audio Sample</h2>
        <div className="stt-performance-actions">
          <button
            type="button"
            onClick={handleRecordingToggle}
            disabled={!recorder.isSupported || isRunning}
          >
            {recorder.isRecording ? (
              <>
                <Square size={18} aria-hidden="true" />
                Stop recording
              </>
            ) : (
              <>
                <Mic size={18} aria-hidden="true" />
                Record
              </>
            )}
          </button>

          <label className="stt-performance-upload">
            <Upload size={18} aria-hidden="true" />
            Upload audio
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={isRunning}
            />
          </label>

          <button
            className="stt-performance-danger"
            type="button"
            onClick={clearAudio}
            disabled={!audioBlob || isRunning}
          >
            <Trash2 size={18} aria-hidden="true" />
            Clear
          </button>
        </div>
        {recorder.error && (
          <div className="stt-performance-error">{recorder.error}</div>
        )}
      </section>

      <section className="stt-performance-audio">
        <h2>{audioName}</h2>
        {audioUrl ? (
          <audio controls src={audioUrl}>
            Audio preview unavailable.
          </audio>
        ) : (
          <p>No audio loaded.</p>
        )}
        {audioDetails && (
          <div className="stt-performance-meta">
            <span>Size: {audioDetails.size}</span>
            <span>Type: {audioDetails.type}</span>
            <span>Duration: {audioDetails.duration}</span>
          </div>
        )}
      </section>

      <section className="stt-performance-settings">
        <h2>Models</h2>
        <div className="stt-performance-settings-grid">
          <div className="stt-performance-field">
            <label htmlFor="stt-language">Language</label>
            <input
              id="stt-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              placeholder="en"
              disabled={isRunning}
            />
          </div>
          {TARGETS.map((target) => (
            <div className="stt-performance-field" key={target.id}>
              <label htmlFor={`model-${target.id}`}>{target.label}</label>
              <input
                id={`model-${target.id}`}
                value={models[target.id]}
                onChange={(event) => updateModel(target.id, event.target.value)}
                disabled={isRunning || target.id === "whisper-large-v3"}
              />
            </div>
          ))}
        </div>
        <div className="stt-performance-field">
          <label htmlFor="gemini-stt-prompt">Gemini prompt</label>
          <textarea
            id="gemini-stt-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={isRunning}
          />
        </div>
      </section>

      <div className="stt-performance-run">
        <p className="stt-performance-run-note">
          Requests run at the same time; use server timing for the cleanest
          provider comparison.
        </p>
        <button
          type="button"
          onClick={runComparison}
          disabled={!audioBlob || isRunning}
        >
          <Play size={18} aria-hidden="true" />
          {isRunning ? "Running..." : "Run comparison"}
        </button>
      </div>

      {pageError && <div className="stt-performance-error">{pageError}</div>}

      <section className="stt-performance-results">
        <h2>Results</h2>
        {comparisonDelta && (
          <div className="stt-performance-delta">{comparisonDelta}</div>
        )}
        <div className="stt-performance-results-grid">
          {TARGETS.map((target) => {
            const run = runs[target.id];
            const result = run.result;
            return (
              <article className="stt-performance-result" key={target.id}>
                <h3>{target.label}</h3>
                <div className="stt-performance-model">
                  {result?.model || models[target.id]} | {target.endpointLabel}
                </div>
                <span className={`stt-performance-status ${run.status}`}>
                  {run.status}
                </span>

                {result && (
                  <div className="stt-performance-stats">
                    <div className="stt-performance-stat">
                      <span>Server</span>
                      <strong>{formatMs(result.durationMs)}</strong>
                    </div>
                    <div className="stt-performance-stat">
                      <span>Round trip</span>
                      <strong>{formatMs(result.clientDurationMs)}</strong>
                    </div>
                    <div className="stt-performance-stat">
                      <span>Chars</span>
                      <strong>{result.text.length.toLocaleString()}</strong>
                    </div>
                    <div className="stt-performance-stat">
                      <span>Input</span>
                      <strong>{result.input.format}</strong>
                    </div>
                  </div>
                )}

                {result?.usage && (
                  <div className="stt-performance-stat">
                    <span>Usage</span>
                    <strong>{summarizeUsage(result.usage)}</strong>
                  </div>
                )}

                {run.error && (
                  <div className="stt-performance-error">{run.error}</div>
                )}

                <div className="stt-performance-transcript">
                  {result?.text || "Transcript will appear here."}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default SttPerformanceTestPage;
