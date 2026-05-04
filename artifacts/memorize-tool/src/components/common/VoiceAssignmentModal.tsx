import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { translations } from "../../data/translations";
import {
  GEMINI_VOICES,
  DEFAULT_VOICE_ID,
  pickSampleLinesForCharacter,
  getAllLinesForCharacter,
  pickRandomLineIndex,
} from "../../data/geminiVoices";
import openaiService from "../../services/openaiService";
import { showToast } from "../../utils";
import "./VoiceAssignmentModal.css";

interface VoiceAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: string[];
  scriptText: string;
  userCharacter?: string;
  scriptId?: string;
}

const RANDOM_MODE_KEY = "voiceRandomSampleMode";
const RANDOM_INDEX_KEY_PREFIX = "voiceRandomSampleIdx:";

function hashScriptText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return `t${(h >>> 0).toString(36)}_${text.length}`;
}

function readRandomIndices(scriptKey: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${RANDOM_INDEX_KEY_PREFIX}${scriptKey}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isInteger(v) && v >= 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function writeRandomIndices(scriptKey: string, value: Record<string, number>): void {
  try {
    localStorage.setItem(`${RANDOM_INDEX_KEY_PREFIX}${scriptKey}`, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

const VoiceAssignmentModal: React.FC<VoiceAssignmentModalProps> = ({
  isOpen,
  onClose,
  characters,
  scriptText,
  userCharacter,
  scriptId,
}) => {
  const { currentLang, voiceAssignments, setVoiceAssignment, clearVoiceAssignments } = useAppContext();
  const t = translations[currentLang] as Record<string, string>;
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [sampleIndex, setSampleIndex] = useState<Record<string, number>>({});

  const scriptKey = useMemo(
    () => (scriptId && scriptId.trim() ? `id:${scriptId}` : `hash:${hashScriptText(scriptText)}`),
    [scriptId, scriptText],
  );

  // Lazy-init from localStorage so cached selections are present on the very
  // first render, before any effect can overwrite them.
  const [randomMode, setRandomMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(RANDOM_MODE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [randomIndices, setRandomIndices] = useState<Record<string, number>>(() =>
    readRandomIndices(scriptKey),
  );
  const lastLoadedScriptKey = useRef<string>(scriptKey);

  // Reload per-script random indices whenever the script changes.
  useEffect(() => {
    if (lastLoadedScriptKey.current === scriptKey) return;
    lastLoadedScriptKey.current = scriptKey;
    setRandomIndices(readRandomIndices(scriptKey));
  }, [scriptKey]);

  const sampleCandidates = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const c of characters) out[c] = pickSampleLinesForCharacter(scriptText, c);
    return out;
  }, [characters, scriptText]);

  const allLines = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const c of characters) out[c] = getAllLinesForCharacter(scriptText, c);
    return out;
  }, [characters, scriptText]);

  // Fill in missing/invalid random indices for visible characters, without
  // touching cached values that are still valid for the current line list.
  useEffect(() => {
    if (!randomMode || !isOpen) return;
    let changed = false;
    const next: Record<string, number> = { ...randomIndices };
    for (const c of characters) {
      const len = (allLines[c] ?? []).length;
      if (len === 0) continue;
      const stored = next[c];
      if (typeof stored !== "number" || stored < 0 || stored >= len) {
        next[c] = pickRandomLineIndex(len);
        changed = true;
      }
    }
    if (changed) {
      setRandomIndices(next);
      writeRandomIndices(scriptKey, next);
    }
  }, [randomMode, isOpen, characters, allLines, randomIndices, scriptKey]);

  const regenerateRandom = useCallback(
    (character: string) => {
      const list = allLines[character] ?? [];
      if (list.length === 0) return;
      setRandomIndices((prev) => {
        const current = prev[character];
        const next = { ...prev, [character]: pickRandomLineIndex(list.length, current) };
        writeRandomIndices(scriptKey, next);
        return next;
      });
    },
    [allLines, scriptKey],
  );

  const getCurrentSample = (character: string): { text: string | null; index: number; total: number } => {
    if (randomMode) {
      const list = allLines[character] ?? [];
      if (list.length === 0) return { text: null, index: 0, total: 0 };
      const stored = randomIndices[character];
      const idx =
        typeof stored === "number" && stored >= 0 && stored < list.length ? stored : 0;
      return { text: list[idx], index: idx, total: list.length };
    }
    const list = sampleCandidates[character] ?? [];
    if (list.length === 0) return { text: null, index: 0, total: 0 };
    const idx = ((sampleIndex[character] ?? 0) % list.length + list.length) % list.length;
    return { text: list[idx], index: idx, total: list.length };
  };

  const cycleSample = (character: string) => {
    if (randomMode) {
      regenerateRandom(character);
      return;
    }
    setSampleIndex((prev) => ({
      ...prev,
      [character]: ((prev[character] ?? 0) + 1),
    }));
  };

  const handleToggleRandom = (next: boolean) => {
    setRandomMode(next);
    try {
      localStorage.setItem(RANDOM_MODE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePlaySample = async (character: string, voiceId: string) => {
    const { text: sample } = getCurrentSample(character);
    if (!sample) {
      const msg = randomMode
        ? (t.voiceRandomNoLines ?? "No spoken lines for this character.")
        : (t.voiceNoSample ?? "No sample line available for this character.");
      showToast(msg, 3000, "error");
      return;
    }
    const key = `${character}__${voiceId}`;
    setPlayingKey(key);
    try {
      // Use default speed/model so the request hashes to the same TTS cache
      // entry as any other call for the same (text, voice) pair.
      const blob = await openaiService.textToSpeech(sample, { voice: voiceId });
      await openaiService.playAudio(blob, { volume: 1 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || (t.errorTtsGeneric ?? "Audio error"), 4000, "error");
    } finally {
      setPlayingKey(null);
    }
  };

  const handleVoiceChange = (character: string, value: string) => {
    setVoiceAssignment(character, value === "" ? null : value);
  };

  return (
    <div className="voice-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="voice-modal" onClick={(e) => e.stopPropagation()}>
        <div className="voice-modal-header">
          <h2>
            🧪 {t.voiceAssignTitle ?? "Assign voices to characters"}
          </h2>
          <button className="voice-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="voice-modal-help">
          {t.voiceAssignHelp ??
            "Experimental — pick a Gemini voice for each character and preview a random line. Selections are saved on this device and cached so the same line+voice never re-generates."}
        </p>
        <div className="voice-modal-experimental">
          <label className="voice-random-toggle">
            <input
              type="checkbox"
              checked={randomMode}
              onChange={(e) => handleToggleRandom(e.target.checked)}
            />
            <span>🧪 {t.voiceRandomToggle ?? "Experimental: random line"}</span>
          </label>
          <p className="voice-random-hint">
            {t.voiceRandomToggleHint ??
              "Pick a random line for each character instead of the curated sample."}
          </p>
        </div>
        <div className="voice-modal-body">
          {characters.length === 0 ? (
            <p className="voice-modal-empty">{t.voiceNoCharacters ?? "No characters detected yet."}</p>
          ) : (
            <ul className="voice-character-list">
              {characters.map((character) => {
                const assigned = voiceAssignments[character] ?? "";
                const effectiveVoice = assigned || DEFAULT_VOICE_ID;
                const { text: sample, index: sIdx, total: sTotal } = getCurrentSample(character);
                const isUser = userCharacter && character.toUpperCase() === userCharacter.toUpperCase();
                const playKey = `${character}__${effectiveVoice}`;
                const isPlaying = playingKey === playKey;
                const totalAvailable = randomMode
                  ? (allLines[character] ?? []).length
                  : sTotal;
                const canCycle = totalAvailable > 1;
                const emptyMessage = randomMode
                  ? (t.voiceRandomNoLines ?? "No spoken lines for this character.")
                  : (t.voiceNoSample ?? "No sample available for this character.");
                return (
                  <li key={character} className={`voice-character-row${isUser ? " is-user" : ""}`}>
                    <div className="voice-character-name">
                      <strong>{character}</strong>
                      {isUser && <span className="voice-user-badge">{t.voiceYouBadge ?? "you"}</span>}
                    </div>
                    <div className="voice-character-controls">
                      <select
                        className="voice-select"
                        value={assigned}
                        onChange={(e) => handleVoiceChange(character, e.target.value)}
                        aria-label={`Voice for ${character}`}
                      >
                        <option value="">
                          {t.voiceDefaultOption ?? `Default (${DEFAULT_VOICE_ID})`}
                        </option>
                        {GEMINI_VOICES.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.id} — {v.hint}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="voice-sample-btn"
                        disabled={!sample || playingKey !== null}
                        onClick={() => handlePlaySample(character, effectiveVoice)}
                        title={sample ?? emptyMessage}
                      >
                        {isPlaying ? "🔊…" : "▶ " + (t.voiceSampleButton ?? "Sample")}
                      </button>
                      {canCycle && (
                        <button
                          type="button"
                          className="voice-shuffle-btn"
                          disabled={playingKey !== null}
                          onClick={() => cycleSample(character)}
                          title={
                            randomMode
                              ? (t.voiceRandomRegenerate ?? "Pick another random line")
                              : (t.voiceShuffleTitle ?? "Try another line")
                          }
                          aria-label={
                            randomMode
                              ? (t.voiceRandomRegenerate ?? "Pick another random line")
                              : (t.voiceShuffleTitle ?? "Try another line")
                          }
                        >
                          🎲 {randomMode ? null : (
                            <span className="voice-shuffle-count">{sIdx + 1}/{sTotal}</span>
                          )}
                        </button>
                      )}
                    </div>
                    {sample ? (
                      <div className="voice-sample-preview" title={sample}>
                        “{sample}”
                      </div>
                    ) : (
                      <div className="voice-sample-preview voice-sample-empty">
                        {emptyMessage}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="voice-modal-footer">
          <button type="button" className="voice-clear-btn" onClick={() => clearVoiceAssignments()}>
            {t.voiceClearAll ?? "Reset all"}
          </button>
          <button type="button" className="voice-done-btn" onClick={onClose}>
            {t.voiceDone ?? "Done"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssignmentModal;
