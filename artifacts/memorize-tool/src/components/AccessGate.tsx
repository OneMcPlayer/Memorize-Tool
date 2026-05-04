import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { translations } from "../data/translations";
import {
  getAccessToken,
  setAccessToken,
  subscribeAccessToken,
  verifyAccessToken,
} from "../lib/accessToken";
import "./AccessGate.css";

interface GateStrings {
  title: string;
  description: string;
  placeholder: string;
  submit: string;
  wrong: string;
  expired: string;
  networkError: string;
}

const FALLBACK: Record<string, GateStrings> = {
  en: {
    title: "Enter access code to use this app",
    description: "This app is invite-only. Enter the access code shared with you to continue.",
    placeholder: "Access code",
    submit: "Unlock",
    wrong: "Wrong access code",
    expired: "Access code is no longer valid, please enter it again",
    networkError: "Could not reach the server. Please try again.",
  },
  it: {
    title: "Inserisci il codice d'accesso per usare l'app",
    description: "L'app è ad accesso riservato. Inserisci il codice che ti è stato condiviso per continuare.",
    placeholder: "Codice d'accesso",
    submit: "Sblocca",
    wrong: "Codice d'accesso errato",
    expired: "Il codice d'accesso non è più valido, inseriscilo di nuovo",
    networkError: "Impossibile contattare il server. Riprova.",
  },
};

interface AccessGateProps {
  children: React.ReactNode;
}

const AccessGate: React.FC<AccessGateProps> = ({ children }) => {
  const { currentLang } = useAppContext();
  const [token, setTokenState] = useState<string | null>(() => getAccessToken());
  const [wasInvalidated, setWasInvalidated] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeAccessToken((newToken) => {
      setTokenState((prev) => {
        if (prev && !newToken) {
          setWasInvalidated(true);
        }
        return newToken;
      });
    });
  }, []);

  const langStrings =
    ((translations as Record<string, Record<string, unknown>>)[currentLang]?.accessGate ?? {}) as Partial<GateStrings>;
  const fallback = FALLBACK[currentLang] ?? FALLBACK.en;
  const t: GateStrings = {
    title: langStrings.title ?? fallback.title,
    description: langStrings.description ?? fallback.description,
    placeholder: langStrings.placeholder ?? fallback.placeholder,
    submit: langStrings.submit ?? fallback.submit,
    wrong: langStrings.wrong ?? fallback.wrong,
    expired: langStrings.expired ?? fallback.expired,
    networkError: langStrings.networkError ?? fallback.networkError,
  };

  if (token) {
    return <>{children}</>;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = input.trim();
    if (!candidate || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyAccessToken(candidate);
      if (ok) {
        setAccessToken(candidate);
        setWasInvalidated(false);
        setInput("");
      } else {
        setError(t.wrong);
      }
    } catch {
      setError(t.networkError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="access-gate" role="dialog" aria-modal="true" aria-labelledby="access-gate-title">
      <div className="access-gate__card">
        <h1 id="access-gate-title" className="access-gate__title">
          {t.title}
        </h1>
        <p className="access-gate__description">{t.description}</p>
        {wasInvalidated && !error ? (
          <div className="access-gate__notice" role="status">
            {t.expired}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="access-gate__form">
          <input
            type="password"
            className="access-gate__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            autoComplete="off"
            autoFocus
            disabled={busy}
            aria-label={t.placeholder}
          />
          <button
            type="submit"
            className="access-gate__submit"
            disabled={busy || input.trim() === ""}
          >
            {busy ? "…" : t.submit}
          </button>
        </form>
        {error ? (
          <div className="access-gate__error" role="alert">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AccessGate;
