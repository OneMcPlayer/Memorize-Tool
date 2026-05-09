import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { ClipboardList } from "lucide-react";
import openaiService, {
  type AudioPlaybackDiagnostics,
} from "../../services/openaiService";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import {
  buildDiagnosticReport,
  captureDiagnostic,
  endDiagnosticSession,
  flushDiagnosticLogs,
  recordDiagnosticBreadcrumb,
  startDiagnosticSession,
} from "../../services/diagnosticsService";
import {
  fetchLineTags,
  saveLineTags,
  buildScriptKey,
  resolveMarkedUpLine,
  migrateLegacyLineTags,
  type LineTagsMap,
} from "../../services/lineTagsService";
import LineCorrectionDiff, {
  CorrectionStatus,
} from "../common/LineCorrectionDiff";
import LineTagsModal from "../common/LineTagsModal";
import VoiceAssignmentModal from "../common/VoiceAssignmentModal";
import { evaluateComparableTextMatch } from "../../utils/wordDiff";

const SUCCESS_FLASH_MS = 1300;
const MIN_STT_CAPTURE_BYTES = 1024;
const MIN_STT_CAPTURE_DURATION_MS = 250;
const LIVE_STT_LANGUAGE = "it";

import { showToast } from "../../utils";
import useMicrophoneRecorder, {
  type RecordingMetadata,
  type RecordingResult,
} from "../../hooks/useMicrophoneRecorder";
import "./InteractiveMemorizationView.css";

interface ScriptEntry {
  index: number;
  line: string;
  speaker: string;
}

interface SequenceItem {
  speaker: string;
  line: string;
  originalIndex: number;
  isUserLine: boolean;
}

type MatchStatus = "correct" | "close" | "off" | "no-input" | "error";

interface Evaluation {
  status: MatchStatus;
  transcript: string;
  message: string;
  expected: string;
  originalIndex: number;
}

interface InteractiveMemorizationViewProps {
  scriptLines: string[];
  extractedLines: ScriptEntry[];
  userCharacter: string;
  onBack: () => void;
  translations: Record<string, Record<string, unknown>>;
  currentLang: string;
  scriptId?: string;
}

const buildSequence = (
  scriptLines: string[],
  userCharacter: string,
): SequenceItem[] => {
  if (!Array.isArray(scriptLines)) return [];
  const sequence: SequenceItem[] = [];
  const normalizedUser = (userCharacter || "").toUpperCase();
  scriptLines.forEach((line, index) => {
    if (!line || !line.trim()) return;
    const match = line.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
    if (!match) return;
    const speaker = match[1].trim();
    const dialogue = match[2].trim();
    sequence.push({
      speaker,
      line: dialogue,
      originalIndex: index,
      isUserLine: speaker.toUpperCase() === normalizedUser,
    });
  });
  return sequence;
};

const friendlyTtsError = (
  error: unknown,
  t: Record<string, string>,
): string => {
  const message = error instanceof Error ? error.message : "";
  const status = (error as { status?: number } | null)?.status;
  if (status === 503)
    return (
      t.errorTtsNotConfigured ?? "Live mode isn't configured on the server."
    );
  if (!message)
    return t.errorTtsGeneric ?? "Error playing audio. Please try again.";
  if (message.includes("Rate limit") || message.includes("rate"))
    return t.errorTtsRateLimit ?? "Rate limit reached.";
  if (message.includes("network") || message.includes("fetch"))
    return t.errorTtsNetwork ?? "Network error.";
  return message;
};

const isExpectedTtsCancellation = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === "AbortError" ||
    error.message.toLowerCase().includes("cancel") ||
    error.message.toLowerCase().includes("stopped"));

const friendlySttError = (
  error: unknown,
  t: Record<string, string>,
): string => {
  const message = error instanceof Error ? error.message : "";
  const status = (error as { status?: number } | null)?.status;
  if (status === 503)
    return (
      t.errorTtsNotConfigured ?? "Live mode isn't configured on the server."
    );
  if (!message)
    return (
      t.errorSttGeneric ?? "Could not transcribe your line. Please try again."
    );
  if (message.includes("timed out"))
    return t.errorSttTimeout ?? "Transcription request timed out.";
  if (message.includes("Rate limit") || message.includes("rate"))
    return t.errorSttRateLimit ?? "Rate limit reached.";
  if (
    message.includes("Audio data is required") ||
    message.includes("Audio data is too short") ||
    message.includes("Audio file is too short") ||
    message.includes("No audio")
  )
    return t.errorSttNoAudio ?? "No audio captured.";
  return message;
};

const evaluateMatch = (
  expected: string,
  actual: string,
): "correct" | "close" | "off" => {
  return evaluateComparableTextMatch(expected, actual);
};

const diagnosticNow = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const diagnosticElapsed = (startedAt: number): number =>
  Math.max(0, Math.round(diagnosticNow() - startedAt));

const recorderDiagnostics = (metadata: RecordingMetadata | null) => ({
  capturedBytes: metadata?.bytes ?? 0,
  captureDurationMs: metadata?.durationMs ?? 0,
  chunkCount: metadata?.chunkCount ?? 0,
  mimeType: metadata?.mimeType ?? "none",
  recorderState: metadata?.recorderState ?? "missing",
  streamActive: metadata?.streamActive ?? false,
  trackCount: metadata?.trackCount ?? 0,
  trackStates: metadata?.trackStates ?? [],
});

const unusableCaptureReason = (
  result: RecordingResult | null,
): string | null => {
  if (!result) return "missing-blob";
  if (result.blob.size === 0) return "empty-blob";
  if (result.blob.size < MIN_STT_CAPTURE_BYTES) return "too-small";
  if (result.metadata.durationMs < MIN_STT_CAPTURE_DURATION_MS) {
    return "too-short";
  }
  return null;
};

const InteractiveMemorizationView = ({
  scriptLines,
  extractedLines,
  userCharacter,
  onBack,
  translations,
  currentLang,
  scriptId,
}: InteractiveMemorizationViewProps) => {
  const t = (translations[currentLang] ?? {}) as Record<string, string>;
  const { isZenModeEnabled, setZenModeEnabled, voiceAssignments } =
    useAppContext();
  const { isAuthenticated } = useAuth();
  const [lineTags, setLineTags] = useState<LineTagsMap>({});
  const [lineTagsMaxLength, setLineTagsMaxLength] = useState<number>(2000);
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [showVoiceAssign, setShowVoiceAssign] = useState(false);

  const scriptKey = useMemo(
    () => buildScriptKey(scriptId, scriptLines.join("\n")),
    [scriptId, scriptLines],
  );

  const sequence = useMemo(
    () => buildSequence(scriptLines, userCharacter),
    [scriptLines, userCharacter],
  );

  const cueLinesForModal = useMemo(
    () =>
      sequence
        .filter((s) => !s.isUserLine)
        .map((s) => ({
          originalIndex: s.originalIndex,
          speaker: s.speaker,
          line: s.line,
        })),
    [sequence],
  );

  const detectedCharacters = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of sequence) {
      if (!seen.has(item.speaker)) {
        seen.add(item.speaker);
        list.push(item.speaker);
      }
    }
    return list;
  }, [sequence]);

  const scriptText = useMemo(() => scriptLines.join("\n"), [scriptLines]);
  const userLineCount = useMemo(
    () => sequence.filter((item) => item.isUserLine).length,
    [sequence],
  );
  const cueLineCount = sequence.length - userLineCount;

  useEffect(() => {
    if (!isAuthenticated) {
      setLineTags({});
      return;
    }
    let cancelled = false;
    fetchLineTags(scriptKey)
      .then((res) => {
        if (cancelled) return;
        if (typeof res.maxLength === "number" && res.maxLength > 0) {
          setLineTagsMaxLength(res.maxLength);
        }
        const raw = res.tags ?? {};
        // The server tags each script's stored entries with a format
        // version. v2 entries are full marked-up lines authored by the
        // user and must be used verbatim. Only v1 (legacy "prefix tag")
        // entries — or unmarked entries from a pre-versioning server —
        // need to be upgraded; we then persist the upgrade so subsequent
        // reads come back as v2 and never re-trigger this path.
        const isLegacy = (res.version ?? 1) < 2;
        if (isLegacy && Object.keys(raw).length > 0) {
          const cueLinesForMigration = sequence
            .filter((s) => !s.isUserLine)
            .map((s) => ({ originalIndex: s.originalIndex, line: s.line }));
          const migrated = migrateLegacyLineTags(raw, cueLinesForMigration);
          setLineTags(migrated);
          saveLineTags(scriptKey, migrated).catch(() => {
            /* best-effort; original prefix entries are still readable */
          });
        } else {
          setLineTags(raw);
        }
      })
      .catch(() => {
        if (!cancelled) setLineTags({});
      });
    return () => {
      cancelled = true;
    };
    // We deliberately omit `sequence` from deps: the migration is a
    // first-load concern and re-running it whenever `sequence` changes
    // would risk re-migrating data that's already in the new format.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, scriptKey]);

  const [cursor, setCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvaluation, setLastEvaluation] = useState<Evaluation | null>(null);
  const [results, setResults] = useState({
    totalLines: 0,
    correctLines: 0,
    closeLines: 0,
  });
  const [testComplete, setTestComplete] = useState(false);
  const [nowSpeakingIndex, setNowSpeakingIndex] = useState<number | null>(null);
  const [zenOverlayVisible, setZenOverlayVisible] = useState(false);
  const [sphereSuccessFlash, setSphereSuccessFlash] = useState(false);

  const cursorRef = useRef(0);
  const cancelRef = useRef(false);
  const isMountedRef = useRef(true);
  const zenFadeTimerRef = useRef<number | null>(null);
  const successFlashTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    const context = {
      authenticated: isAuthenticated,
      cueLineCount,
      scriptKey,
      sequenceLength: sequence.length,
      userCharacter,
      userLineCount,
    };

    void startDiagnosticSession({
      context,
      mode: "live-memorization",
      route: "InteractiveMemorizationView",
    }).then((sessionId) => {
      recordDiagnosticBreadcrumb("live-view-mounted", {
        ...context,
        sessionStarted: Boolean(sessionId),
      });
    });

    return () => {
      cancelRef.current = true;
      openaiService.stopAudio("Live view unmounted");
      recordDiagnosticBreadcrumb("live-view-unmounted", {
        cursor: cursorRef.current,
        scriptKey,
        sequenceLength: sequence.length,
      });
      endDiagnosticSession("live-view-unmounted");
    };
  }, [
    cueLineCount,
    isAuthenticated,
    scriptKey,
    sequence.length,
    userCharacter,
    userLineCount,
  ]);

  const {
    isSupported: micSupported,
    hasPermission: micPermission,
    isRecording: micRecording,
    error: micRecorderError,
    requestPermission,
    startRecording,
    stopRecording,
    cancelRecording,
    releaseStream,
    getRecorderSnapshot,
  } = useMicrophoneRecorder();

  const upcomingNonUserLines = useMemo(() => {
    const items: SequenceItem[] = [];
    for (let i = cursor; i < sequence.length; i += 1) {
      if (sequence[i].isUserLine) break;
      items.push(sequence[i]);
    }
    return items;
  }, [sequence, cursor]);

  const nextUserLine = useMemo(() => {
    for (let i = cursor; i < sequence.length; i += 1) {
      if (sequence[i].isUserLine) return sequence[i];
    }
    return null;
  }, [sequence, cursor]);

  const userTurn = upcomingNonUserLines.length === 0 && nextUserLine !== null;
  const finished = nextUserLine === null && upcomingNonUserLines.length === 0;
  const retryableEvaluation =
    lastEvaluation !== null &&
    nextUserLine !== null &&
    lastEvaluation.originalIndex === nextUserLine.originalIndex &&
    (lastEvaluation.status === "close" || lastEvaluation.status === "off");

  useEffect(() => {
    if (finished && sequence.length > 0 && !testComplete) {
      setTestComplete(true);
    }
  }, [finished, sequence.length, testComplete]);

  useEffect(() => {
    setCursor(0);
    setLastEvaluation(null);
    setResults({ totalLines: 0, correctLines: 0, closeLines: 0 });
    setTestComplete(false);
    setError(null);
  }, [sequence]);

  // Zen overlay auto-fade lifecycle
  const clearZenFadeTimer = useCallback(() => {
    if (zenFadeTimerRef.current !== null) {
      window.clearTimeout(zenFadeTimerRef.current);
      zenFadeTimerRef.current = null;
    }
  }, []);

  const clearSuccessFlashTimer = useCallback(() => {
    if (successFlashTimerRef.current !== null) {
      window.clearTimeout(successFlashTimerRef.current);
      successFlashTimerRef.current = null;
    }
  }, []);

  const triggerSuccessFlash = useCallback(() => {
    clearSuccessFlashTimer();
    setSphereSuccessFlash(true);
    successFlashTimerRef.current = window.setTimeout(() => {
      setSphereSuccessFlash(false);
      successFlashTimerRef.current = null;
    }, SUCCESS_FLASH_MS);
  }, [clearSuccessFlashTimer]);

  useEffect(
    () => () => {
      clearZenFadeTimer();
      clearSuccessFlashTimer();
    },
    [clearZenFadeTimer, clearSuccessFlashTimer],
  );

  const showZenOverlay = useCallback(() => {
    clearZenFadeTimer();
    setZenOverlayVisible(true);
  }, [clearZenFadeTimer]);

  const hideZenOverlay = useCallback(() => {
    clearZenFadeTimer();
    setZenOverlayVisible(false);
  }, [clearZenFadeTimer]);

  const addLineResult = useCallback((status: MatchStatus) => {
    if (status !== "correct" && status !== "close" && status !== "off") {
      return;
    }
    setResults((prev) => ({
      totalLines: prev.totalLines + 1,
      correctLines: prev.correctLines + (status === "correct" ? 1 : 0),
      closeLines: prev.closeLines + (status === "close" ? 1 : 0),
    }));
  }, []);

  const handlePlayNext = useCallback(async () => {
    if (isPlaying || isTranscribing) return;
    if (upcomingNonUserLines.length === 0) return;
    setError(null);
    hideZenOverlay();
    setIsPlaying(true);
    cancelRef.current = false;
    let playedCount = 0;
    const primeStartedAt = diagnosticNow();
    try {
      const primed = await openaiService.primeAudioPlayback();
      recordDiagnosticBreadcrumb(
        "tts-playback-primed",
        {
          elapsedMs: diagnosticElapsed(primeStartedAt),
          primed,
        },
        primed ? "info" : "warn",
      );
    } catch (err) {
      recordDiagnosticBreadcrumb(
        "tts-playback-prime-failed",
        {
          elapsedMs: diagnosticElapsed(primeStartedAt),
          message: err instanceof Error ? err.message : String(err),
        },
        "warn",
      );
    }
    if (cancelRef.current) {
      if (isMountedRef.current) {
        setIsPlaying(false);
        setNowSpeakingIndex(null);
      }
      return;
    }
    recordDiagnosticBreadcrumb("tts-sequence-started", {
      cursor,
      lineCount: upcomingNonUserLines.length,
      scriptKey,
    });
    try {
      for (let i = 0; i < upcomingNonUserLines.length; i += 1) {
        if (cancelRef.current) break;
        const item = upcomingNonUserLines[i];
        const lineStartedAt = diagnosticNow();
        setNowSpeakingIndex(i);
        const assignedVoice = voiceAssignments[item.speaker];
        const ttsOpts: { voice?: string } = {};
        if (assignedVoice) ttsOpts.voice = assignedVoice;
        const ttsText = resolveMarkedUpLine(
          lineTags[String(item.originalIndex)],
          item.line,
        );
        recordDiagnosticBreadcrumb("tts-line-requested", {
          hasAssignedVoice: Boolean(assignedVoice),
          lineLength: item.line.length,
          originalIndex: item.originalIndex,
          sequenceOffset: i,
          voice: assignedVoice ?? null,
        });
        const audioBlob = await openaiService.textToSpeech(ttsText, ttsOpts);
        recordDiagnosticBreadcrumb("tts-line-ready", {
          generatedBytes: audioBlob.size,
          mimeType: audioBlob.type || "unknown",
          elapsedMs: diagnosticElapsed(lineStartedAt),
          originalIndex: item.originalIndex,
          sequenceOffset: i,
        });
        if (cancelRef.current) break;
        let playbackDiagnostics: AudioPlaybackDiagnostics | null = null;
        await openaiService.playAudio(audioBlob, {
          onEnded: (diagnostics) => {
            playbackDiagnostics = diagnostics;
            recordDiagnosticBreadcrumb("tts-audio-ended", {
              audio: diagnostics,
              originalIndex: item.originalIndex,
              sequenceOffset: i,
            });
          },
          onError: (diagnostics) => {
            recordDiagnosticBreadcrumb(
              "tts-audio-error",
              {
                audio: diagnostics,
                originalIndex: item.originalIndex,
                sequenceOffset: i,
              },
              "warn",
            );
          },
          volume: 1,
        });
        playedCount += 1;
        recordDiagnosticBreadcrumb("tts-line-played", {
          audio: playbackDiagnostics,
          elapsedMs: diagnosticElapsed(lineStartedAt),
          originalIndex: item.originalIndex,
          sequenceOffset: i,
        });
      }
      if (playedCount > 0 && isMountedRef.current) {
        setCursor((prev) => prev + playedCount);
      }
      recordDiagnosticBreadcrumb("tts-sequence-completed", {
        advancedBy: playedCount,
        cancelled: cancelRef.current,
        cursor,
        requestedLineCount: upcomingNonUserLines.length,
      });
    } catch (err) {
      if (cancelRef.current && isExpectedTtsCancellation(err)) {
        recordDiagnosticBreadcrumb("tts-sequence-cancelled", {
          advancedBy: playedCount,
          cursor,
          lineCount: upcomingNonUserLines.length,
          message: err instanceof Error ? err.message : String(err),
        });
        return;
      }
      const friendly = friendlyTtsError(err, t);
      recordDiagnosticBreadcrumb(
        "tts-sequence-failed",
        {
          cursor,
          lineCount: upcomingNonUserLines.length,
          message: friendly,
        },
        "error",
      );
      captureDiagnostic({
        error: err,
        extras: {
          cursor,
          lineCount: upcomingNonUserLines.length,
          scriptKey,
        },
        severity: "error",
        type: "tts-playback-error",
      });
      if (isMountedRef.current) {
        setError(friendly);
        showToast(friendly, 5000, "error");
      }
    } finally {
      if (isMountedRef.current) {
        setIsPlaying(false);
        setNowSpeakingIndex(null);
      }
    }
  }, [
    cursor,
    hideZenOverlay,
    isPlaying,
    isTranscribing,
    lineTags,
    scriptKey,
    t,
    upcomingNonUserLines,
    voiceAssignments,
  ]);

  const handleStartRecording = useCallback(async () => {
    recordDiagnosticBreadcrumb("recording-start-requested", {
      cursor,
      micPermission,
      micSupported,
      userTurn,
    });
    if (!micSupported) {
      recordDiagnosticBreadcrumb(
        "recording-start-blocked",
        {
          reason: "microphone-unsupported",
        },
        "warn",
      );
      showToast(
        t.errorMicNotSupported ?? "Microphone not supported in this browser.",
        4000,
        "error",
      );
      return;
    }
    setError(null);
    setLastEvaluation(null);
    hideZenOverlay();
    try {
      if (!micPermission) {
        recordDiagnosticBreadcrumb("microphone-permission-requested", {
          cursor,
        });
        const granted = await requestPermission();
        recordDiagnosticBreadcrumb(
          "microphone-permission-result",
          {
            cursor,
            granted,
          },
          granted ? "info" : "warn",
        );
        if (!granted) {
          showToast(
            t.errorMicDenied ?? "Microphone permission denied.",
            4000,
            "warning",
          );
          return;
        }
      }
      await startRecording();
      recordDiagnosticBreadcrumb("recording-started", {
        cursor,
        ...recorderDiagnostics(getRecorderSnapshot()),
        userTurn,
      });
    } catch (err) {
      const friendly =
        err instanceof Error
          ? err.message
          : (t.errorMicStart ?? "Unable to start recording.");
      recordDiagnosticBreadcrumb(
        "recording-start-failed",
        {
          cursor,
          message: friendly,
        },
        "error",
      );
      captureDiagnostic({
        error: err,
        extras: {
          cursor,
          micPermission,
          micSupported,
          userTurn,
        },
        severity: "error",
        type: "recording-start-error",
      });
      setError(friendly);
      showToast(friendly, 4000, "error");
    }
  }, [
    cursor,
    hideZenOverlay,
    micPermission,
    micSupported,
    requestPermission,
    startRecording,
    t,
    userTurn,
    getRecorderSnapshot,
  ]);

  const handleStopRecording = useCallback(async () => {
    if (!nextUserLine) return;
    const stopStartedAt = diagnosticNow();
    recordDiagnosticBreadcrumb("recording-stop-requested", {
      cursor,
      lineChars: nextUserLine.line.length,
      originalIndex: nextUserLine.originalIndex,
    });
    let result: RecordingResult | null = null;
    try {
      result = await stopRecording();
      recordDiagnosticBreadcrumb("recording-stopped", {
        ...recorderDiagnostics(result?.metadata ?? null),
        stopElapsedMs: diagnosticElapsed(stopStartedAt),
        originalIndex: nextUserLine.originalIndex,
      });
    } catch (err) {
      recordDiagnosticBreadcrumb(
        "recording-stop-failed",
        {
          elapsedMs: diagnosticElapsed(stopStartedAt),
          message: err instanceof Error ? err.message : String(err),
          originalIndex: nextUserLine.originalIndex,
        },
        "warn",
      );
      captureDiagnostic({
        error: err,
        extras: {
          cursor,
          originalIndex: nextUserLine.originalIndex,
        },
        severity: "warning",
        type: "recording-stop-error",
      });
      // ignore — handled below by no-input case
    } finally {
      releaseStream();
      recordDiagnosticBreadcrumb("microphone-stream-released", {
        cursor,
        originalIndex: nextUserLine.originalIndex,
        reason: "recording-stopped",
      });
    }
    const expected = nextUserLine.line;
    const unusableReason = unusableCaptureReason(result);
    if (unusableReason) {
      recordDiagnosticBreadcrumb(
        "recording-unusable",
        {
          cursor,
          ...recorderDiagnostics(result?.metadata ?? null),
          originalIndex: nextUserLine.originalIndex,
          reason: unusableReason,
        },
        "warn",
      );
      captureDiagnostic({
        extras: {
          cursor,
          ...recorderDiagnostics(result?.metadata ?? null),
          originalIndex: nextUserLine.originalIndex,
          reason: unusableReason,
        },
        severity: "warning",
        type: "recording-unusable",
      });
      const evalResult: Evaluation = {
        status: "no-input",
        transcript: "",
        message:
          t.correctionNoUsableInput ??
          t.correctionNoInput ??
          "Recording did not start correctly. Tap Record and try again.",
        expected,
        originalIndex: nextUserLine.originalIndex,
      };
      setLastEvaluation(evalResult);
      showZenOverlay();
      showToast(evalResult.message, 4000, "warning");
      return;
    }
    if (!result) return;
    const audio = result.blob;
    setIsTranscribing(true);
    try {
      const sttStartedAt = diagnosticNow();
      recordDiagnosticBreadcrumb("stt-request-started", {
        capturedBytes: result.metadata.bytes,
        captureDurationMs: result.metadata.durationMs,
        chunkCount: result.metadata.chunkCount,
        lineChars: expected.length,
        mimeType: audio.type || "unknown",
        language: LIVE_STT_LANGUAGE,
        originalIndex: nextUserLine.originalIndex,
      });
      const transcript = await openaiService.speechToText(audio, {
        language: LIVE_STT_LANGUAGE,
      });
      const status = evaluateMatch(expected, transcript);
      recordDiagnosticBreadcrumb("stt-result", {
        elapsedMs: diagnosticElapsed(sttStartedAt),
        lineChars: expected.length,
        originalIndex: nextUserLine.originalIndex,
        status,
        transcriptLength: transcript.length,
      });
      const message =
        status === "correct"
          ? (t.feedbackCorrect ?? "Great — that matches the script.")
          : status === "close"
            ? (t.feedbackCloseRetry ??
              t.feedbackClose ??
              "Close — most of the line is there. Try again or continue.")
            : (t.feedbackOffRetry ??
              t.feedbackOff ??
              "That doesn't match the script. Try again or continue.");
      const evalResult: Evaluation = {
        status,
        transcript,
        message,
        expected,
        originalIndex: nextUserLine.originalIndex,
      };
      setLastEvaluation(evalResult);
      const tone =
        status === "correct"
          ? "success"
          : status === "close"
            ? "info"
            : "warning";
      showToast(message, 4000, tone);
      // Zen mode: only show overlay if there's something to show (errors).
      // On success, trigger a transient sphere flash instead of any overlay.
      if (status !== "correct") {
        showZenOverlay();
      } else {
        addLineResult(status);
        hideZenOverlay();
        triggerSuccessFlash();
        setCursor((prev) => prev + 1);
      }
    } catch (err) {
      const friendly = friendlySttError(err, t);
      recordDiagnosticBreadcrumb(
        "stt-failed",
        {
          cursor,
          message: friendly,
          ...recorderDiagnostics(result.metadata),
          originalIndex: nextUserLine.originalIndex,
        },
        "error",
      );
      captureDiagnostic({
        error: err,
        extras: {
          cursor,
          ...recorderDiagnostics(result.metadata),
          lineChars: expected.length,
          language: LIVE_STT_LANGUAGE,
          originalIndex: nextUserLine.originalIndex,
        },
        severity: "error",
        type: "stt-error",
      });
      const evalResult: Evaluation = {
        status: "error",
        transcript: "",
        message: friendly,
        expected,
        originalIndex: nextUserLine.originalIndex,
      };
      setLastEvaluation(evalResult);
      setError(friendly);
      showZenOverlay();
      showToast(friendly, 5000, "error");
    } finally {
      setIsTranscribing(false);
    }
  }, [
    currentLang,
    addLineResult,
    cursor,
    hideZenOverlay,
    nextUserLine,
    showZenOverlay,
    stopRecording,
    releaseStream,
    t,
    triggerSuccessFlash,
  ]);

  const handleContinueAfterEvaluation = useCallback(() => {
    if (!retryableEvaluation || !lastEvaluation) return;
    recordDiagnosticBreadcrumb("line-evaluation-continued", {
      cursor,
      originalIndex: lastEvaluation.originalIndex,
      status: lastEvaluation.status,
      transcriptLength: lastEvaluation.transcript.length,
    });
    addLineResult(lastEvaluation.status);
    hideZenOverlay();
    setCursor((prev) => prev + 1);
  }, [
    addLineResult,
    cursor,
    hideZenOverlay,
    lastEvaluation,
    retryableEvaluation,
  ]);

  const handleRetryLine = useCallback(async () => {
    if (!retryableEvaluation || !lastEvaluation) return;
    recordDiagnosticBreadcrumb("line-evaluation-retry-requested", {
      cursor,
      originalIndex: lastEvaluation.originalIndex,
      status: lastEvaluation.status,
      transcriptLength: lastEvaluation.transcript.length,
    });
    await handleStartRecording();
  }, [cursor, handleStartRecording, lastEvaluation, retryableEvaluation]);

  const handleRecordToggle = useCallback(async () => {
    if (isPlaying || isTranscribing) return;
    if (!userTurn) return;
    if (micRecording) {
      await handleStopRecording();
    } else {
      await handleStartRecording();
    }
  }, [
    isPlaying,
    isTranscribing,
    userTurn,
    micRecording,
    handleStartRecording,
    handleStopRecording,
  ]);

  const handleCopyDebugReport = useCallback(async () => {
    recordDiagnosticBreadcrumb("debug-report-copy-requested", {
      cursor,
      scriptKey,
      sequenceLength: sequence.length,
    });
    await flushDiagnosticLogs();
    const report = buildDiagnosticReport();
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(report);
      recordDiagnosticBreadcrumb("debug-report-copied", {
        cursor,
        reportLength: report.length,
      });
      showToast(t.debugReportCopied ?? "Debug report copied.", 3000, "success");
    } catch (err) {
      recordDiagnosticBreadcrumb(
        "debug-report-copy-failed",
        {
          cursor,
          message: err instanceof Error ? err.message : String(err),
        },
        "warn",
      );
      captureDiagnostic({
        error: err,
        extras: {
          cursor,
          reportLength: report.length,
        },
        severity: "warning",
        type: "debug-report-copy-error",
      });
      showToast(
        t.debugReportCopyFailed ?? "Could not copy debug report.",
        4000,
        "error",
      );
    }
  }, [cursor, scriptKey, sequence.length, t]);

  const handleRestart = useCallback(() => {
    recordDiagnosticBreadcrumb("live-restart", {
      cursor,
      results,
      scriptKey,
      sequenceLength: sequence.length,
    });
    cancelRecording();
    cancelRef.current = true;
    openaiService.stopAudio("Live playback restarted");
    hideZenOverlay();
    clearSuccessFlashTimer();
    setSphereSuccessFlash(false);
    setCursor(0);
    setLastEvaluation(null);
    setResults({ totalLines: 0, correctLines: 0, closeLines: 0 });
    setTestComplete(false);
    setError(null);
  }, [
    cancelRecording,
    clearSuccessFlashTimer,
    cursor,
    hideZenOverlay,
    results,
    scriptKey,
    sequence.length,
  ]);

  const handleBack = useCallback(() => {
    recordDiagnosticBreadcrumb("live-back", {
      cursor,
      results,
      scriptKey,
      sequenceLength: sequence.length,
    });
    cancelRecording();
    cancelRef.current = true;
    openaiService.stopAudio("Live view left");
    hideZenOverlay();
    onBack();
  }, [
    cancelRecording,
    cursor,
    hideZenOverlay,
    onBack,
    results,
    scriptKey,
    sequence.length,
  ]);

  if (sequence.length === 0) {
    return (
      <div className="interactive-memorization-view">
        <h1>{t.interactiveMemorizationTitle ?? "Live Practice"}</h1>
        <div className="error">
          <p>
            {t.errorParse ??
              "Unable to parse the script. Please go back and try again."}
          </p>
          <button onClick={handleBack} className="back-btn">
            {t.backButton ?? "Back"}
          </button>
        </div>
      </div>
    );
  }

  if (testComplete) {
    const accuracy =
      results.totalLines > 0
        ? (results.correctLines / results.totalLines) * 100
        : 0;
    return (
      <div className="interactive-memorization-view">
        <h1>{t.interactiveMemorizationTitle ?? "Live Practice"}</h1>
        <div className="test-complete">
          <h2>{t.testComplete ?? "Practice Complete!"}</h2>
          <div className="results-summary">
            <h3>{t.resultsSummary ?? "Your Results"}</h3>
            <div className="results-stats">
              <div className="result-stat">
                <span className="stat-label">
                  {t.totalLines ?? "Total Lines"}
                </span>
                <span className="stat-value">{results.totalLines}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">
                  {t.correctLines ?? "Correct Lines"}
                </span>
                <span className="stat-value">{results.correctLines}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">{t.accuracy ?? "Accuracy"}</span>
                <span className="stat-value">{accuracy.toFixed(1)}%</span>
              </div>
            </div>
          </div>
          <div className="test-complete-actions">
            <button onClick={handleRestart} className="restart-btn">
              {t.restartButton ?? "Restart"}
            </button>
            <button onClick={handleBack} className="back-btn">
              {t.backButton ?? "Back"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const playLabel = t.playNextButton ?? "▶️ Play next";
  const recordStartLabel = t.recordStartButton ?? "🎤 Record";
  const recordStopLabel = t.recordStopButton ?? "⏹ Stop & check";
  const retryLineLabel = t.retryLineButton ?? "Try again";
  const continueLineLabel = t.continueLineButton ?? "Continue";
  const retryActionDisabled = isPlaying || isTranscribing || micRecording;
  const retryActions = retryableEvaluation ? (
    <div className="line-retry-actions" data-testid="line-retry-actions">
      <button
        type="button"
        className="line-retry-btn"
        onClick={handleRetryLine}
        disabled={retryActionDisabled}
        data-testid="line-retry-btn"
      >
        {retryLineLabel}
      </button>
      <button
        type="button"
        className="line-continue-btn"
        onClick={handleContinueAfterEvaluation}
        disabled={retryActionDisabled}
        data-testid="line-continue-btn"
      >
        {continueLineLabel}
      </button>
    </div>
  ) : null;

  // Determine sphere visual state for zen mode
  let sphereState:
    | "idle"
    | "speaking"
    | "your-turn"
    | "recording"
    | "checking"
    | "success" = "idle";
  let sphereCaption = t.zenSphereIdle ?? "Ready";
  if (isTranscribing) {
    sphereState = "checking";
    sphereCaption = t.zenSphereChecking ?? "Checking…";
  } else if (isPlaying) {
    sphereState = "speaking";
    sphereCaption = t.zenSphereSpeaking ?? "Listening to your scene partners…";
  } else if (micRecording) {
    sphereState = "recording";
    sphereCaption = t.zenSphereRecording ?? "Recording…";
  } else if (sphereSuccessFlash) {
    sphereState = "success";
    sphereCaption = t.zenSphereSuccess ?? t.feedbackCorrect ?? "Great!";
  } else if (userTurn) {
    sphereState = "your-turn";
    sphereCaption = t.zenSphereYourTurn ?? "Your turn — say your line";
  }

  // Determine the single contextual zen action button
  const zenAction = (() => {
    if (isTranscribing)
      return {
        label: t.zenActionWaiting ?? "Waiting…",
        onClick: () => {},
        disabled: true,
        kind: "checking" as const,
      };
    if (isPlaying)
      return {
        label: t.zenSphereSpeaking ?? "Playing…",
        onClick: () => {},
        disabled: true,
        kind: "speaking" as const,
      };
    if (micRecording)
      return {
        label: t.zenActionStop ?? "Stop & check",
        onClick: handleRecordToggle,
        disabled: false,
        kind: "stop" as const,
      };
    if (retryableEvaluation)
      return {
        label: retryLineLabel,
        onClick: handleRetryLine,
        disabled: false,
        kind: "record" as const,
      };
    if (userTurn)
      return {
        label: t.zenActionRecord ?? "Record",
        onClick: handleRecordToggle,
        disabled: false,
        kind: "record" as const,
      };
    if (upcomingNonUserLines.length > 0)
      return {
        label: t.zenActionPlay ?? "Play scene",
        onClick: handlePlayNext,
        disabled: false,
        kind: "play" as const,
      };
    return {
      label: t.zenActionWaiting ?? "Waiting…",
      onClick: () => {},
      disabled: true,
      kind: "idle" as const,
    };
  })();

  const evaluationStatus: CorrectionStatus | null = lastEvaluation
    ? lastEvaluation.status === "correct" ||
      lastEvaluation.status === "close" ||
      lastEvaluation.status === "off"
      ? lastEvaluation.status
      : lastEvaluation.status
    : null;

  if (isZenModeEnabled) {
    return (
      <div
        className="interactive-memorization-view zen-view"
        data-testid="zen-view"
      >
        <button
          type="button"
          className="zen-icon-btn zen-icon-btn--back"
          onClick={handleBack}
          aria-label={t.backButton ?? "Back"}
          title={t.backButton ?? "Back"}
        >
          ‹
        </button>
        <button
          type="button"
          className="zen-icon-btn zen-icon-btn--restart"
          onClick={handleRestart}
          aria-label={t.restartButton ?? "Restart"}
          title={t.restartButton ?? "Restart"}
        >
          ↻
        </button>
        <button
          type="button"
          className="zen-icon-btn zen-icon-btn--exit-zen"
          onClick={() => setZenModeEnabled(false)}
          aria-label={t.zenExitToClassic ?? "Switch to classic mode"}
          title={t.zenExitToClassic ?? "Switch to classic mode"}
          data-testid="zen-exit-btn"
        >
          ⊞
        </button>

        <div className="zen-stage" data-testid="zen-stage">
          <div
            className={`zen-sphere zen-sphere--${sphereState}`}
            data-testid="zen-sphere"
            data-state={sphereState}
            aria-live="polite"
          >
            <div className="zen-sphere__core" />
            <div className="zen-sphere__ring zen-sphere__ring--1" />
            <div className="zen-sphere__ring zen-sphere__ring--2" />
            <div className="zen-sphere__ring zen-sphere__ring--3" />
          </div>
          <p className="zen-caption" data-testid="zen-caption">
            {sphereCaption}
          </p>
        </div>

        {lastEvaluation && evaluationStatus && zenOverlayVisible && (
          <div
            className="zen-correction-overlay"
            data-testid="zen-correction-overlay"
            onClick={hideZenOverlay}
          >
            <div
              className="zen-correction-overlay__inner"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="zen-correction-overlay__close"
                onClick={hideZenOverlay}
                aria-label={t.closeButton ?? "Close"}
                title={t.closeButton ?? "Close"}
                data-testid="zen-correction-close"
              >
                ×
              </button>
              <LineCorrectionDiff
                transcript={lastEvaluation.transcript}
                expected={lastEvaluation.expected}
                status={evaluationStatus}
                message={lastEvaluation.message}
                compact
                labels={{
                  transcribed: t.zenCorrectionTitle ?? "What I heard",
                  comparison: t.zenComparisonLabel ?? "Compared to your line",
                  noInput: t.correctionNoInput ?? "No audio captured.",
                  errorTitle: t.correctionError ?? "Transcription error",
                  perfect: t.zenPerfect ?? "Perfect.",
                }}
              />
              {retryActions}
            </div>
          </div>
        )}

        <div className="zen-action-bar" data-testid="zen-action-bar">
          <button
            type="button"
            className={`zen-action-btn zen-action-btn--${zenAction.kind}`}
            onClick={zenAction.onClick}
            disabled={zenAction.disabled}
            data-testid="zen-action-btn"
          >
            {zenAction.label}
          </button>
        </div>

        {!micSupported && (
          <p className="zen-mic-status">
            {t.micUnsupported ?? "Microphone not supported in this browser."}
          </p>
        )}
      </div>
    );
  }

  // Classic layout
  return (
    <div className="interactive-memorization-view">
      <div className="live-header">
        <h1>{t.interactiveMemorizationTitle ?? "Live Practice"}</h1>
        {isAuthenticated && (
          <button
            type="button"
            className="live-header__edit-tags-btn"
            onClick={() => setTagsModalOpen(true)}
            data-testid="open-line-tags-btn"
            title={
              (
                (translations[currentLang]?.lineTags ?? {}) as Record<
                  string,
                  string
                >
              ).openTitle ??
              "Add performance tags to cue lines (e.g. [whisper])"
            }
          >
            🏷️{" "}
            {(
              (translations[currentLang]?.lineTags ?? {}) as Record<
                string,
                string
              >
            ).openButton ?? "Edit cue tags"}
          </button>
        )}
        {detectedCharacters.length > 0 && (
          <button
            type="button"
            className="live-header__edit-tags-btn voice-assign-trigger"
            onClick={() => setShowVoiceAssign(true)}
            data-testid="open-voice-assign-btn"
            title={t.voiceAssignTitle ?? "Assign voices to characters"}
          >
            🧪 {t.voiceAssignButton ?? "Assign voices"}
          </button>
        )}
        <label
          className="zen-mode-inline-toggle"
          data-testid="zen-mode-inline-toggle"
        >
          <span className="zen-mode-inline-toggle__label">
            {t.zenModeToggle ?? "Zen Mode"}
          </span>
          <input
            type="checkbox"
            checked={isZenModeEnabled}
            onChange={(e) => setZenModeEnabled(e.target.checked)}
            data-testid="zen-mode-inline-toggle-input"
          />
          <span className="zen-mode-inline-toggle__switch" aria-hidden="true" />
        </label>
      </div>

      {error && (
        <div className="live-error" data-testid="live-error">
          <p>{error}</p>
        </div>
      )}

      <div className="live-stage" data-testid="live-stage">
        {upcomingNonUserLines.length > 0 ? (
          <div className="other-lines-block">
            <h3>{t.upcomingLines ?? "Upcoming lines"}</h3>
            <ul className="other-lines-list">
              {upcomingNonUserLines.map((item, i) => (
                <li
                  key={`${item.originalIndex}-${i}`}
                  className={`other-line${nowSpeakingIndex === i ? " speaking" : ""}`}
                  data-testid="upcoming-line"
                >
                  <strong>{item.speaker}:</strong> {item.line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {nextUserLine ? (
          <div
            className={`user-line-block${userTurn ? " active" : ""}`}
            data-testid="user-line-block"
          >
            <h3>
              {(t.yourTurnPrompt ?? "It's your turn, {character}!").replace(
                "{character}",
                userCharacter || nextUserLine.speaker,
              )}
            </h3>
            <p className="user-line-hidden">
              <em>
                {t.userLineHidden ??
                  "Speak your line, then stop the recording to check it."}
              </em>
            </p>
          </div>
        ) : null}

        {lastEvaluation && evaluationStatus && (
          <>
            <LineCorrectionDiff
              transcript={lastEvaluation.transcript}
              expected={lastEvaluation.expected}
              status={evaluationStatus}
              message={lastEvaluation.message}
              labels={{
                transcribed: t.correctionTranscribed ?? "What you said",
                comparison: t.correctionComparison ?? "Compared to the script",
                noInput: t.correctionNoInput ?? "No audio captured.",
                errorTitle: t.correctionError ?? "Transcription error",
                perfect: t.correctionPerfect ?? "Perfect — exact match!",
              }}
            />
            {retryActions}
          </>
        )}
      </div>

      <div className="live-controls" data-testid="live-controls">
        <button
          className="play-next-btn"
          onClick={handlePlayNext}
          disabled={
            isPlaying || isTranscribing || upcomingNonUserLines.length === 0
          }
          data-testid="play-next-btn"
        >
          {isPlaying ? (t.playingLabel ?? "Playing...") : playLabel}
        </button>
        <button
          className={`record-btn${micRecording ? " recording" : ""}`}
          onClick={handleRecordToggle}
          disabled={!userTurn || isPlaying || isTranscribing}
          data-testid="record-btn"
        >
          {isTranscribing
            ? (t.checkingLabel ?? "Checking...")
            : micRecording
              ? recordStopLabel
              : retryableEvaluation
                ? retryLineLabel
                : recordStartLabel}
        </button>
      </div>

      {!micSupported && (
        <p className="mic-status">
          {t.micUnsupported ?? "Microphone not supported in this browser."}
        </p>
      )}
      {micRecorderError && <p className="mic-error">{micRecorderError}</p>}

      <div className="navigation-buttons">
        <button onClick={handleRestart} className="restart-btn">
          {t.restartButton ?? "Restart"}
        </button>
        <button
          type="button"
          onClick={handleCopyDebugReport}
          className="debug-report-btn"
          data-testid="copy-debug-report-btn"
          title={t.debugReportTitle ?? "Copy a sanitized debug report"}
        >
          <ClipboardList size={16} aria-hidden="true" />
          <span>{t.copyDebugReportButton ?? "Copy debug report"}</span>
        </button>
        <button onClick={handleBack} className="back-btn">
          {t.backButton ?? "Back"}
        </button>
      </div>

      <VoiceAssignmentModal
        isOpen={showVoiceAssign}
        onClose={() => setShowVoiceAssign(false)}
        characters={detectedCharacters}
        scriptText={scriptText}
        userCharacter={userCharacter}
        scriptId={scriptId}
      />

      {isAuthenticated && (
        <LineTagsModal
          isOpen={tagsModalOpen}
          onClose={() => setTagsModalOpen(false)}
          scriptKey={scriptKey}
          cueLines={cueLinesForModal}
          initialTags={lineTags}
          onSaved={(next) => setLineTags(next)}
          maxLength={lineTagsMaxLength}
        />
      )}
    </div>
  );
};

export default InteractiveMemorizationView;
