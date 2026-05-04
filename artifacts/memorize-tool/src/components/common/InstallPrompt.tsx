import React, { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { translations } from "../../data/translations";
import "./InstallPrompt.css";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const { currentLang } = useAppContext();
  const t = ((translations as Record<string, Record<string, unknown>>)[currentLang]?.installPrompt ?? {}) as Record<string, string>;

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);
      const dismissed = localStorage.getItem("installPromptDismissed");
      if (!dismissed) setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = () => {
    if (!deferredPrompt) return;
    void deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null);
      setShowPrompt(false);
    });
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("installPromptDismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">📱</div>
        <div className="install-prompt-text">
          <h3>{t.title ?? "Install App"}</h3>
          <p>{t.message ?? "Install this app on your device for a better experience."}</p>
        </div>
        <div className="install-prompt-actions">
          <button className="install-prompt-dismiss" onClick={handleDismiss}>
            {t.dismiss ?? "Not now"}
          </button>
          <button className="install-prompt-install" onClick={handleInstall}>
            {t.install ?? "Install"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
