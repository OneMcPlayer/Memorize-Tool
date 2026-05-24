import React, { useMemo } from "react";
import { computeWordDiff, hasErrors as diffHasErrors } from "../../utils/wordDiff";
import "./LineCorrectionDiff.css";

export type CorrectionStatus = "correct" | "close" | "off" | "no-input" | "error";

interface LineCorrectionDiffProps {
  transcript: string;
  expected: string;
  status: CorrectionStatus;
  message?: string;
  labels?: {
    transcribed?: string;
    comparison?: string;
    noInput?: string;
    errorTitle?: string;
    expectedHidden?: string;
    perfect?: string;
  };
  compact?: boolean;
}

const LineCorrectionDiff: React.FC<LineCorrectionDiffProps> = ({
  transcript,
  expected,
  status,
  message,
  labels = {},
  compact = false,
}) => {
  const diff = useMemo(() => {
    if (status === "no-input" || status === "error") return [];
    return computeWordDiff(expected, transcript);
  }, [expected, transcript, status]);

  const errors = diffHasErrors(diff);

  if (status === "no-input") {
    return (
      <div
        className={`line-correction line-correction--no-input${compact ? " line-correction--compact" : ""}`}
        data-testid="line-correction"
      >
        <p className="line-correction__title">{labels.noInput ?? "Nessun audio acquisito."}</p>
        {message && <p className="line-correction__message">{message}</p>}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className={`line-correction line-correction--error${compact ? " line-correction--compact" : ""}`}
        data-testid="line-correction"
      >
        <p className="line-correction__title">{labels.errorTitle ?? "Errore di trascrizione"}</p>
        {message && <p className="line-correction__message">{message}</p>}
      </div>
    );
  }

  return (
    <div
      className={`line-correction line-correction--${status}${compact ? " line-correction--compact" : ""}`}
      data-testid="line-correction"
    >
      {transcript && (
        <div className="line-correction__row">
          <span className="line-correction__label">{labels.transcribed ?? "Detto"}</span>
          <p className="line-correction__transcript">{transcript}</p>
        </div>
      )}

      {diff.length > 0 && (
        <div className="line-correction__row">
          <span className="line-correction__label">{labels.comparison ?? "Confronto"}</span>
          <div className="line-correction__diff" data-testid="line-correction-diff">
            {diff.map((item, idx) => (
              <span
                key={`${item.word}-${idx}`}
                className={`line-correction__word line-correction__word--${item.status}`}
              >
                {item.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {!errors && status === "correct" && labels.perfect && (
        <p className="line-correction__perfect">{labels.perfect}</p>
      )}
    </div>
  );
};

export default LineCorrectionDiff;
