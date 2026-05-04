import React, { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { translations } from "../../data/translations";
import "./OfflineIndicator.css";

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const { currentLang } = useAppContext();
  const t = ((translations as Record<string, Record<string, unknown>>)[currentLang]?.offlineIndicator ?? {}) as Record<string, string>;

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="offline-indicator">
      <span className="offline-icon">📶</span>
      <span className="offline-text">{t.message ?? "You are offline. Some features may be limited."}</span>
    </div>
  );
};

export default OfflineIndicator;
