import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import InteractiveMemorizationView from './InteractiveMemorizationView';
import { translations } from '../../data/translations';
import './ScriptMemorizationPractice.css';

/**
 * Script Memorization Practice Component
 *
 * This component provides an interface for practicing script memorization
 * with speech recognition and text-to-speech capabilities.
 */
const ScriptMemorizationPractice = ({ onBack }) => {
  const {
    scriptLines,
    extractedLines,
    currentLang
  } = useAppContext();

  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userCharacter, setUserCharacter] = useState('');

  // Get translations
  const t = translations[currentLang] || {};

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);

        // Get user character from extracted lines
        if (extractedLines && extractedLines.length > 0) {
          setUserCharacter(extractedLines[0].speaker);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initialize();
  }, [extractedLines]);

  // Handle start button click
  const handleStart = () => {
    setIsStarted(true);
  };

  // Handle back button click
  const handleBack = () => {
    setIsStarted(false);
    onBack();
  };

  if (isLoading) {
    return (
      <div className="script-memorization-practice loading">
        <h1>{t.loading || 'Loading...'}</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="script-memorization-practice error">
        <h1>{t.error || 'Error'}</h1>
        <p>{error}</p>
        <button onClick={handleBack} className="back-btn">
          {t.backButton || 'Back'}
        </button>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="script-memorization-practice intro">
        <h1>{t.scriptMemorizationPractice || 'Script Memorization Practice'}</h1>

        <div className="intro-content">
          <div className="intro-header">
            <div className="intro-icon">
              <span role="img" aria-label="Microphone">🎭</span>
            </div>
            <p className="intro-description">
              {t.practiceDescription ||
                'This feature helps you practice your lines by having the system play all other characters while you say your lines.'}
            </p>
          </div>

          <div className="feature-list">
            <h2>{t.howItWorks || 'How It Works'}</h2>
            <ul>
              <li className="feature-item">
                <span className="feature-icon">🔊</span>
                <span className="feature-text">
                  {t.featureItem1 || 'The system will play the lines of all other characters using text-to-speech'}
                </span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">🎤</span>
                <span className="feature-text">
                  {t.featureItem2 || 'When it\'s your turn, you\'ll need to say your line'}
                </span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">👂</span>
                <span className="feature-text">
                  {t.featureItem3 || 'The system will listen and check if your line matches the script'}
                </span>
              </li>
              <li className="feature-item">
                <span className="feature-icon">📊</span>
                <span className="feature-text">
                  {t.featureItem4 || 'You\'ll get feedback on how well you remembered your lines'}
                </span>
              </li>
              <li className="feature-item api-key-item">
                <span className="feature-icon">🔑</span>
                <span className="feature-text">
                  {t.featureItem5 || 'This feature requires an OpenAI API key for text-to-speech and speech recognition'}
                </span>
              </li>
            </ul>
          </div>

          <div className="benefits-section">
            <h2>{t.benefits || 'Benefits'}</h2>
            <div className="benefits-grid">
              <div className="benefit-item">
                <span className="benefit-icon">⏱️</span>
                <h3>{t.benefitTitle1 || 'Practice Efficiently'}</h3>
                <p>{t.benefitDesc1 || 'No need for a scene partner - practice anytime, anywhere'}</p>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">📈</span>
                <h3>{t.benefitTitle2 || 'Track Progress'}</h3>
                <p>{t.benefitDesc2 || 'Get instant feedback on your line accuracy'}</p>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🔄</span>
                <h3>{t.benefitTitle3 || 'Repeat Difficult Scenes'}</h3>
                <p>{t.benefitDesc3 || 'Focus on the parts you need to practice most'}</p>
              </div>
            </div>
          </div>

          <div className="api-key-info">
            <h3>{t.apiKeyInfo || 'About the OpenAI API Key'}</h3>
            <p>
              {t.apiKeyDescription ||
                'Your OpenAI API key is stored locally in your browser and is never sent to our servers. ' +
                'It\'s used only to access OpenAI\'s text-to-speech and speech recognition services.'}
            </p>
            <p className="api-key-note">
              {t.apiKeyNote ||
                'Note: Using this feature will incur charges on your OpenAI account based on usage.'}
            </p>
          </div>

          <div className="start-actions">
            <button onClick={handleStart} className="start-btn">
              <span className="btn-icon">▶️</span>
              {t.startButton || 'Start Practice'}
            </button>
            <button onClick={handleBack} className="back-btn">
              <span className="btn-icon">←</span>
              {t.backButton || 'Back'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <InteractiveMemorizationView
      scriptLines={scriptLines}
      extractedLines={extractedLines}
      userCharacter={userCharacter}
      onBack={handleBack}
      translations={translations}
      currentLang={currentLang}
    />
  );
};

export default ScriptMemorizationPractice;
