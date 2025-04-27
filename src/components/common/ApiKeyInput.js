import React, { useState, useEffect } from 'react';
import openaiService from '../../services/openaiService';
import './ApiKeyInput.css';

/**
 * API Key Input Component
 *
 * This component provides a form for users to input their OpenAI API key.
 * The key is stored in localStorage for persistence.
 */
const ApiKeyInput = ({ onKeySet, translations, currentLang }) => {
  const [apiKey, setApiKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Get translations
  const t = translations[currentLang] || {};

  // Initialize from localStorage
  useEffect(() => {
    const savedKey = openaiService.getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
      if (onKeySet) onKeySet(true);
    }
  }, [onKeySet]);

  // Handle API key change
  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value);
    setIsSaved(false);
  };

  // Handle save button click
  const handleSave = () => {
    if (apiKey.trim()) {
      openaiService.setApiKey(apiKey.trim());
      setIsSaved(true);
      if (onKeySet) onKeySet(true);
    }
  };

  // Handle clear button click
  const handleClear = () => {
    setApiKey('');
    openaiService.setApiKey('');
    setIsSaved(false);
    if (onKeySet) onKeySet(false);
  };

  // Toggle visibility of the API key
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="api-key-input">
      <h3>{t.apiKeyTitle || 'OpenAI API Key'}</h3>
      <p className="api-key-description">
        {t.apiKeyDescription ||
          'This feature requires an OpenAI API key to use text-to-speech and speech recognition. ' +
          'Your key is stored locally in your browser and is never sent to our servers.'}
      </p>

      <div className="api-key-form">
        <div className="api-key-field">
          <input
            type={isVisible ? 'text' : 'password'}
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder={t.apiKeyPlaceholder || 'Enter your OpenAI API key'}
            className={isSaved ? 'saved' : ''}
          />
          <button
            className="visibility-toggle"
            onClick={toggleVisibility}
            aria-label={isVisible ? 'Hide API key' : 'Show API key'}
            title={isVisible ? 'Hide API key' : 'Show API key'}
          >
            {isVisible ? '👁️' : '👁️'}
          </button>
        </div>

        <div className="api-key-actions">
          <button
            className="save-key-btn"
            onClick={handleSave}
            disabled={!apiKey.trim() || isSaved}
          >
            {isSaved ? (t.apiKeySaved || 'Saved') : (t.apiKeySave || 'Save')}
          </button>

          <button
            className="clear-key-btn"
            onClick={handleClear}
            disabled={!apiKey.trim()}
          >
            {t.apiKeyClear || 'Clear'}
          </button>
        </div>
      </div>

      <div className="api-key-info">
        <p>
          {t.apiKeyInfo ||
            'You can get an API key from the OpenAI website. ' +
            'This will incur charges based on your usage.'}
        </p>
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="api-key-link"
        >
          {t.apiKeyGetLink || 'Get an API key'}
        </a>
      </div>
    </div>
  );
};

export default ApiKeyInput;
