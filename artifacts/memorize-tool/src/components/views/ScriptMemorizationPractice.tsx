import React, { useState, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import InteractiveMemorizationView from "./InteractiveMemorizationView";
import AccessGate from "../AccessGate";
import { translations } from "../../data/translations";
import "./ScriptMemorizationPractice.css";

interface ScriptMemorizationPracticeProps {
  onBack: () => void;
}

const ScriptMemorizationPractice = ({ onBack }: ScriptMemorizationPracticeProps) => {
  const { scriptLines, extractedLines, currentLang } = useAppContext();
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCharacter, setUserCharacter] = useState("");

  const t = (translations[currentLang] ?? {}) as Record<string, string>;

  useEffect(() => {
    try {
      if (extractedLines && extractedLines.length > 0) {
        setUserCharacter(extractedLines[0].speaker);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [extractedLines]);

  const handleStart = () => setIsStarted(true);
  const handleBack = () => {
    setIsStarted(false);
    onBack();
  };

  if (error) {
    return (
      <div className="script-memorization-practice error">
        <h1>{t.error ?? "Error"}</h1>
        <p>{error}</p>
        <button onClick={handleBack} className="back-btn">
          {t.backButton ?? "Back"}
        </button>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="script-memorization-practice intro">
        <h1>{t.scriptMemorizationPractice ?? "Script Memorization Practice"}</h1>
        <div className="intro-content">
          <div className="intro-header">
            <div className="intro-icon">
              <span role="img" aria-label="Microphone">🎭</span>
            </div>
            <p className="intro-description">{t.practiceDescription}</p>
          </div>

          <div className="feature-list">
            <h2>{t.howItWorks ?? "How It Works"}</h2>
            <ul>
              <li className="feature-item"><span className="feature-icon">🔊</span><span className="feature-text">{t.featureItem1}</span></li>
              <li className="feature-item"><span className="feature-icon">🎤</span><span className="feature-text">{t.featureItem2}</span></li>
              <li className="feature-item"><span className="feature-icon">👂</span><span className="feature-text">{t.featureItem3}</span></li>
              <li className="feature-item"><span className="feature-icon">📊</span><span className="feature-text">{t.featureItem4}</span></li>
            </ul>
          </div>

          <div className="benefits-section">
            <h2>{t.benefits ?? "Benefits"}</h2>
            <div className="benefits-grid">
              <div className="benefit-item">
                <span className="benefit-icon">⏱️</span>
                <h3>{t.benefitTitle1}</h3>
                <p>{t.benefitDesc1}</p>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">📈</span>
                <h3>{t.benefitTitle2}</h3>
                <p>{t.benefitDesc2}</p>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🔄</span>
                <h3>{t.benefitTitle3}</h3>
                <p>{t.benefitDesc3}</p>
              </div>
            </div>
          </div>

          <div className="start-actions">
            <button onClick={handleStart} className="start-btn">
              <span className="btn-icon">▶️</span>
              {t.startButton ?? "Start Practice"}
            </button>
            <button onClick={handleBack} className="back-btn">
              <span className="btn-icon">←</span>
              {t.backButton ?? "Back"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AccessGate>
      <InteractiveMemorizationView
        scriptLines={scriptLines}
        extractedLines={extractedLines}
        userCharacter={userCharacter}
        onBack={handleBack}
        translations={translations}
        currentLang={currentLang}
      />
      {/* scriptId is intentionally omitted here; the live view falls back to a
          content-hash key so per-line tags stay tied to the actual script text. */}
    </AccessGate>
  );
};

export default ScriptMemorizationPractice;
