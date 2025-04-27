import React, { useState, useEffect } from 'react';
import InteractiveScriptTestingView from './InteractiveScriptTestingView';
import ttsService from '../../utils/ttsService';
import './ScriptMemorizationTester.css';

/**
 * Script Memorization Tester Component
 * 
 * This component provides an interface for testing script memorization
 * where the system plays all other roles and waits for the user to say their lines.
 */
const ScriptMemorizationTester = ({ 
  scriptLines, 
  extractedLines, 
  userCharacter,
  onBack,
  translations,
  currentLang
}) => {
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [experimentalMode, setExperimentalMode] = useState(false);
  
  // Translations shorthand
  const t = translations[currentLang] || {};

  // Initialize TTS service
  useEffect(() => {
    const initTTS = async () => {
      try {
        setIsLoading(true);
        
        // Check if TTS is available
        if (!ttsService.isAvailable()) {
          throw new Error('Text-to-speech is not supported in this browser');
        }
        
        // Set demo mode by default for now
        ttsService.setDemoMode(true);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing TTS:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    initTTS();
    
    // Clean up
    return () => {
      ttsService.stop();
    };
  }, []);

  // Handle start button click
  const handleStart = () => {
    setIsStarted(true);
  };

  // Handle back button click
  const handleBack = () => {
    setIsStarted(false);
    onBack();
  };

  // Toggle experimental mode
  const toggleExperimentalMode = () => {
    setExperimentalMode(!experimentalMode);
  };

  if (isLoading) {
    return (
      <div className="script-memorization-tester loading">
        <h1>{t.loading || 'Loading...'}</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="script-memorization-tester error">
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
      <div className="script-memorization-tester intro">
        <h1>{t.scriptMemorizationTester || 'Script Memorization Tester'}</h1>
        
        <div className="intro-content">
          <p className="intro-description">
            {t.testerDescription || 
              'This feature helps you practice your lines by having the system play all other characters while you say your lines.'}
          </p>
          
          <div className="feature-list">
            <h2>{t.howItWorks || 'How It Works'}</h2>
            <ul>
              <li>{t.featureItem1 || 'The system will play the lines of all other characters'}</li>
              <li>{t.featureItem2 || 'When it\'s your turn, you\'ll see a prompt to say your line'}</li>
              <li>{t.featureItem3 || 'After you say your line, click "I Said My Line" to continue'}</li>
              <li>{t.featureItem4 || 'If you need help, click "Need Help" to see your line'}</li>
              <li>{t.featureItem5 || 'Currently in demo mode - characters won\'t actually speak'}</li>
            </ul>
          </div>
          
          <div className="experimental-toggle">
            <label>
              <input 
                type="checkbox" 
                checked={experimentalMode} 
                onChange={toggleExperimentalMode}
              />
              {t.experimentalMode || 'Enable Experimental Mode'}
            </label>
            <p className="experimental-note">
              {t.experimentalNote || 
                'Experimental mode enables additional features that are still in development.'}
            </p>
          </div>
          
          <div className="start-actions">
            <button onClick={handleStart} className="start-btn">
              {t.startButton || 'Start Practice'}
            </button>
            <button onClick={handleBack} className="back-btn">
              {t.backButton || 'Back'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <InteractiveScriptTestingView
      scriptLines={scriptLines}
      extractedLines={extractedLines}
      userCharacter={userCharacter}
      onBack={handleBack}
      translations={translations}
      currentLang={currentLang}
      experimentalMode={experimentalMode}
    />
  );
};

export default ScriptMemorizationTester;
