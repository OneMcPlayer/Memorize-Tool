import React, { useEffect, useState } from "react";
import { useApiHealth } from "../../hooks/useApiHealth";
import { useAppContext } from "../../context/AppContext";
import { translations } from "../../data/translations";
import "./ApiUnreachableBanner.css";

const FAILURE_THRESHOLD = 3;

interface BannerStrings {
  title: string;
  message: string;
  retry: string;
  dismiss: string;
}

const FALLBACK_STRINGS: Record<string, BannerStrings> = {
  en: {
    title: "API server unreachable",
    message:
      "We can't reach the API server. Try restarting the workflows from the Replit panel.",
    retry: "Retry",
    dismiss: "Dismiss",
  },
  it: {
    title: "Server API non raggiungibile",
    message:
      "Non riusciamo a contattare il server API. Prova a riavviare i workflow dal pannello di Replit.",
    retry: "Riprova",
    dismiss: "Chiudi",
  },
};

const ApiUnreachableBanner: React.FC = () => {
  const { status, consecutiveFailures, errorMessage, recheck } = useApiHealth();
  const { currentLang } = useAppContext();
  const [dismissed, setDismissed] = useState(false);

  const langTranslations = (translations as Record<string, Record<string, unknown>>)[currentLang] ?? {};
  const apiUnreachable = (langTranslations.apiUnreachable ?? {}) as Partial<BannerStrings>;
  const fallback = FALLBACK_STRINGS[currentLang] ?? FALLBACK_STRINGS.en;
  const t: BannerStrings = {
    title: apiUnreachable.title ?? fallback.title,
    message: apiUnreachable.message ?? fallback.message,
    retry: apiUnreachable.retry ?? fallback.retry,
    dismiss: apiUnreachable.dismiss ?? fallback.dismiss,
  };

  // Re-show the banner when health is restored and then breaks again.
  useEffect(() => {
    if (status === "online" && dismissed) {
      setDismissed(false);
    }
  }, [status, dismissed]);

  const shouldShow =
    !dismissed && status === "offline" && consecutiveFailures >= FAILURE_THRESHOLD;

  if (!shouldShow) return null;

  return (
    <div
      className="api-unreachable-banner"
      role="alert"
      aria-live="assertive"
      data-testid="api-unreachable-banner"
    >
      <div className="api-unreachable-banner__icon" aria-hidden="true">⚠️</div>
      <div className="api-unreachable-banner__content">
        <div className="api-unreachable-banner__title">{t.title}</div>
        <div className="api-unreachable-banner__message">{t.message}</div>
        {errorMessage ? (
          <div className="api-unreachable-banner__detail" title={errorMessage}>
            {errorMessage}
          </div>
        ) : null}
      </div>
      <div className="api-unreachable-banner__actions">
        <button
          type="button"
          className="api-unreachable-banner__retry"
          onClick={() => recheck()}
        >
          {t.retry}
        </button>
        <button
          type="button"
          className="api-unreachable-banner__dismiss"
          onClick={() => setDismissed(true)}
          aria-label={t.dismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default ApiUnreachableBanner;
