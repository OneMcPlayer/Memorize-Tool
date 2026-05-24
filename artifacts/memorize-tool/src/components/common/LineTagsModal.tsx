import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { translations } from "../../data/translations";
import {
  buildAutoVoiceProfileAssignments,
  resolveVoiceProfile,
} from "../../data/geminiVoices";
import {
  prepareLineForTts,
  saveLineTags,
  type LineTagsMap,
} from "../../services/lineTagsService";
import openaiService from "../../services/openaiService";
import { showToast } from "../../utils";
import "./LineTagsModal.css";

interface CueLine {
  originalIndex: number;
  speaker: string;
  line: string;
}

interface LineTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptKey: string;
  characters: string[];
  cueLines: CueLine[];
  initialTags: LineTagsMap;
  onSaved: (next: LineTagsMap) => void;
  maxLength: number;
}

const LineTagsModal: React.FC<LineTagsModalProps> = ({
  isOpen,
  onClose,
  scriptKey,
  characters,
  cueLines,
  initialTags,
  onSaved,
  maxLength,
}) => {
  const { currentLang, voiceAssignments } = useAppContext();
  const t = (translations[currentLang] ?? {}) as Record<string, unknown>;
  const tt = (t.lineTags ?? {}) as Record<string, string>;

  // The persisted entry is the full marked-up line in the new model. Any
  // legacy prefix entries are upgraded once at the load boundary in
  // InteractiveMemorizationView before we receive `initialTags`, so we trust
  // values verbatim here.
  const buildInitialDraft = (): LineTagsMap => {
    const next: LineTagsMap = {};
    for (const c of cueLines) {
      const key = String(c.originalIndex);
      const saved = (initialTags[key] ?? "").trim();
      if (!saved) continue;
      next[key] = saved;
    }
    return next;
  };

  const [draft, setDraft] = useState<LineTagsMap>(buildInitialDraft);
  const [saving, setSaving] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const firstFieldRef = useRef<HTMLTextAreaElement | null>(null);
  // Token to invalidate in-flight TTS fetches when the user clicks a different
  // row or stops playback.
  const playTokenRef = useRef(0);
  // Track the previous `isOpen` so we only rebuild the draft on the
  // closed→open transition. Re-running on every `initialTags`/`cueLines`
  // reference change would wipe unsaved edits whenever the parent
  // re-renders (timers, recording state, etc. produce new array refs).
  const wasOpenRef = useRef(false);
  const autoVoiceProfileAssignments = useMemo(
    () => buildAutoVoiceProfileAssignments(characters, scriptKey),
    [characters, scriptKey],
  );

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setDraft(buildInitialDraft());
      const id = window.setTimeout(() => firstFieldRef.current?.focus(), 50);
      wasOpenRef.current = true;
      return () => window.clearTimeout(id);
    }
    if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Stop any preview when the modal closes.
  useEffect(() => {
    if (!isOpen) {
      playTokenRef.current += 1;
      openaiService.stopAudio();
      setPlayingIdx(null);
      setLoadingIdx(null);
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      playTokenRef.current += 1;
      openaiService.stopAudio();
    },
    [],
  );

  const draftValueFor = (c: CueLine): string => {
    const key = String(c.originalIndex);
    return draft[key] ?? c.line;
  };

  const dirty = useMemo(() => {
    // Compare the current draft to the persisted baseline. Both sides are
    // already in the new "full marked-up line" format, so this is a direct
    // string comparison after dropping empty / "same as original" entries.
    const baseline: LineTagsMap = {};
    for (const c of cueLines) {
      const key = String(c.originalIndex);
      const saved = (initialTags[key] ?? "").trim();
      if (!saved) continue;
      baseline[key] = saved;
    }
    const normalize = (m: LineTagsMap): Record<string, string> => {
      const out: Record<string, string> = {};
      for (const c of cueLines) {
        const key = String(c.originalIndex);
        const v = (m[key] ?? "").trim();
        // An entry equal to the original line text means "no markup".
        if (!v || v === c.line.trim()) continue;
        out[key] = v;
      }
      return out;
    };
    const a = normalize(draft);
    const b = normalize(baseline);
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (a[k] !== b[k]) return true;
    }
    return false;
  }, [draft, initialTags, cueLines]);

  if (!isOpen) return null;

  const handleChange = (idx: number, value: string) => {
    setDraft((prev) => ({ ...prev, [String(idx)]: value }));
  };

  const handleReset = (c: CueLine) => {
    setDraft((prev) => {
      const next = { ...prev };
      // Setting back to original line text — keep it in the draft so the
      // textarea stays in sync; on save we'll drop it as "no markup".
      next[String(c.originalIndex)] = c.line;
      return next;
    });
  };

  const stopPreview = () => {
    playTokenRef.current += 1;
    openaiService.stopAudio();
    setPlayingIdx(null);
    setLoadingIdx(null);
  };

  const handlePlayToggle = async (c: CueLine) => {
    const idx = c.originalIndex;
    // Toggle off if this row is the active one.
    if (playingIdx === idx || loadingIdx === idx) {
      stopPreview();
      return;
    }
    // Stop any in-flight or current playback first.
    stopPreview();

    const text = prepareLineForTts(draftValueFor(c));
    if (!text) return;

    const myToken = ++playTokenRef.current;
    setLoadingIdx(idx);
    try {
      const assignedVoice = voiceAssignments[c.speaker];
      const autoVoice = resolveVoiceProfile(
        autoVoiceProfileAssignments[c.speaker],
        "gemini",
      ).voiceId;
      const ttsOpts: { voice?: string } = { voice: assignedVoice || autoVoice };
      const blob = await openaiService.textToSpeech(text, ttsOpts);
      if (myToken !== playTokenRef.current) return; // superseded
      setLoadingIdx(null);
      setPlayingIdx(idx);
      try {
        await openaiService.playAudio(blob, { volume: 1 });
      } finally {
        if (myToken === playTokenRef.current) {
          setPlayingIdx(null);
        }
      }
    } catch (err) {
      if (myToken !== playTokenRef.current) return;
      setLoadingIdx(null);
      setPlayingIdx(null);
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`${tt.playError ?? "Could not play preview"}: ${msg}`, 4500, "error");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // Stop any preview while saving.
    stopPreview();
    try {
      const cleaned: LineTagsMap = {};
      for (const c of cueLines) {
        const key = String(c.originalIndex);
        const v = (draft[key] ?? "").trim();
        // Skip empty or "same as original" — those mean no markup.
        if (!v || v === c.line.trim()) continue;
        cleaned[key] = v;
      }
      const res = await saveLineTags(scriptKey, cleaned);
      onSaved(res.tags);
      showToast(tt.savedToast ?? "Tags saved.", 2500, "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`${tt.saveErrorToast ?? "Could not save tags"}: ${msg}`, 4500, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    stopPreview();
    onClose();
  };

  return (
    <div
      className="line-tags-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lineTagsTitle"
      data-testid="line-tags-modal"
    >
      <div className="line-tags-modal__panel">
        <header className="line-tags-modal__header">
          <h2 id="lineTagsTitle">{tt.title ?? "Edit cue tags"}</h2>
          <button
            type="button"
            className="line-tags-modal__close"
            onClick={handleClose}
            aria-label={tt.close ?? "Close"}
            disabled={saving}
          >
            ✕
          </button>
        </header>

        <p className="line-tags-modal__hint">
          {tt.hint ??
            "Edit each cue line and place bracketed tags anywhere inside it (e.g. \"Hello [angry] world, [whisper] goodbye\"). The whole marked-up line is sent to the voice."}
        </p>

        <div className="line-tags-modal__body">
          {cueLines.length === 0 ? (
            <p className="line-tags-modal__empty">
              {tt.empty ?? "No cue lines from other characters in this script."}
            </p>
          ) : (
            <ul className="line-tags-modal__list">
              {cueLines.map((c, i) => {
                const key = String(c.originalIndex);
                const value = draft[key] ?? c.line;
                const isPlaying = playingIdx === c.originalIndex;
                const isLoading = loadingIdx === c.originalIndex;
                const otherBusy =
                  (playingIdx !== null && playingIdx !== c.originalIndex) ||
                  (loadingIdx !== null && loadingIdx !== c.originalIndex);
                const hasText = (value ?? "").trim().length > 0;
                const isOriginal = (value ?? "").trim() === c.line.trim();
                return (
                  <li key={key} className="line-tags-modal__row" data-testid="line-tags-row">
                    <div className="line-tags-modal__line">
                      <span className="line-tags-modal__original-label">
                        {tt.originalLabel ?? "Original line"}
                      </span>
                      <div>
                        <span className="line-tags-modal__speaker">{c.speaker}:</span>{" "}
                        <span className="line-tags-modal__text">{c.line}</span>
                      </div>
                    </div>
                    <div className="line-tags-modal__field">
                      <textarea
                        ref={i === 0 ? firstFieldRef : undefined}
                        className="line-tags-modal__input"
                        value={value}
                        maxLength={maxLength}
                        rows={2}
                        placeholder={tt.placeholder ?? "Hello [angry] world"}
                        onChange={(e) => handleChange(c.originalIndex, e.target.value)}
                        data-testid={`line-tags-input-${c.originalIndex}`}
                        aria-label={`${tt.fieldAria ?? "Marked-up text for line"} ${i + 1}`}
                        disabled={saving}
                      />
                      <div className="line-tags-modal__row-actions">
                        <button
                          type="button"
                          className={`line-tags-modal__play${isPlaying ? " is-playing" : ""}`}
                          onClick={() => handlePlayToggle(c)}
                          disabled={
                            saving || !hasText || (otherBusy && !isPlaying && !isLoading)
                          }
                          aria-label={
                            isPlaying || isLoading
                              ? (tt.stop ?? "Stop preview")
                              : (tt.play ?? "Play preview")
                          }
                          title={
                            isLoading
                              ? (tt.fetching ?? "Loading preview…")
                              : isPlaying
                              ? (tt.stop ?? "Stop preview")
                              : (tt.play ?? "Play preview")
                          }
                          data-testid={`line-tags-play-${c.originalIndex}`}
                        >
                          {isLoading ? (
                            <span className="line-tags-modal__spinner" aria-hidden="true" />
                          ) : isPlaying ? (
                            "■"
                          ) : (
                            "▶"
                          )}
                        </button>
                        <button
                          type="button"
                          className="line-tags-modal__reset"
                          onClick={() => handleReset(c)}
                          disabled={saving || isOriginal}
                          aria-label={tt.reset ?? "Reset to original"}
                          title={tt.reset ?? "Reset to original"}
                          data-testid={`line-tags-reset-${c.originalIndex}`}
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="line-tags-modal__footer">
          <button
            type="button"
            className="line-tags-modal__btn line-tags-modal__btn--ghost"
            onClick={handleClose}
            disabled={saving}
          >
            {tt.cancel ?? "Cancel"}
          </button>
          <button
            type="button"
            className="line-tags-modal__btn line-tags-modal__btn--primary"
            onClick={handleSave}
            disabled={saving || !dirty}
            data-testid="line-tags-save"
          >
            {saving ? tt.saving ?? "Saving…" : tt.save ?? "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LineTagsModal;
