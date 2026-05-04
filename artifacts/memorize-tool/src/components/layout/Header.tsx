import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { translations } from '../../data/translations';

interface HeaderProps {
  onOpenConverter: () => void;
  onOpenAbout: () => void;
  onOpenProfile: () => void;
  onOpenAudioTest: () => void;
  onOpenTtsTest: () => void;
}

type OptionsView = 'main' | 'experimental';

const Header = ({ onOpenConverter, onOpenAbout, onOpenProfile, onOpenAudioTest, onOpenTtsTest }: HeaderProps) => {
  const {
    currentLang,
    setLanguage,
    toggleDarkMode,
    isAdvancedMode,
    setAdvancedMode,
    isCustomScriptInputEnabled,
    setCustomScriptInputEnabled,
    isLoginEnabled,
    setLoginEnabled,
    isCopyButtonEnabled,
    setCopyButtonEnabled,
  } = useAppContext();
  const { isAuthenticated } = useAuth();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [optionsView, setOptionsView] = useState<OptionsView>('main');
  const experimentalEntryRef = useRef<HTMLButtonElement | null>(null);
  const shouldReturnFocusRef = useRef(false);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };

  const handleThemeToggle = () => {
    toggleDarkMode();
  };

  const handleOptionsToggle = () => {
    if (!optionsVisible) {
      setOptionsView('main');
    }
    setOptionsVisible(!optionsVisible);
  };

  const handleAdvancedModeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdvancedMode(e.target.checked);
  };

  useEffect(() => {
    if (!isAdvancedMode && optionsView === 'experimental') {
      setOptionsView('main');
    }
  }, [isAdvancedMode, optionsView]);

  useEffect(() => {
    if (!optionsVisible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOptionsVisible(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEsc);
    };
  }, [optionsVisible]);

  useEffect(() => {
    if (optionsView === 'main' && shouldReturnFocusRef.current) {
      shouldReturnFocusRef.current = false;
      experimentalEntryRef.current?.focus();
    }
  }, [optionsView]);

  const isMobileDevice = () => {
    return window.innerWidth < 1024;
  };

  const t = translations[currentLang] as Record<string, unknown>;

  const titleId = optionsView === 'experimental' ? 'experimentalOptionsTitle' : 'optionsModalTitle';

  return (
    <header className="app-header">
      <div className="header-controls">
        <select
          id="languageSelect"
          value={currentLang}
          onChange={handleLanguageChange}
          data-testid="languageSelect"
        >
          <option value="en">English</option>
          <option value="it">Italiano</option>
        </select>

        <div className="header-right">
          <button
            id="themeToggle"
            onClick={handleThemeToggle}
            aria-label="Toggle dark mode"
          >
            🌓
          </button>

          {isAdvancedMode && isLoginEnabled && (
            <button
              id="profileToggle"
              onClick={onOpenProfile}
              aria-label={isAuthenticated ? 'Profile' : 'Login'}
              title={isAuthenticated ? 'Profile' : 'Login'}
            >
              {isAuthenticated ? '👤' : '🔑'}
            </button>
          )}

          <button
            id="optionsToggle"
            onClick={handleOptionsToggle}
            aria-label="Options menu"
            aria-haspopup="dialog"
            aria-expanded={optionsVisible}
          >
            ⚙️
          </button>
        </div>
      </div>

      {optionsVisible && (
        <div
          className="options-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOptionsVisible(false)}
        >
          <div className="options-modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="options-modal__handle" aria-hidden="true" />

            {optionsView === 'main' && (
              <>
                <div className="options-modal__header">
                  <h2 id="optionsModalTitle">{(t.optionsTitle as string) || 'Options'}</h2>
                  <button
                    type="button"
                    className="options-modal__close modal-close-icon"
                    onClick={() => setOptionsVisible(false)}
                    aria-label={(t.closeButton as string) || 'Close'}
                  >
                    ✕
                  </button>
                </div>

                <div className="options-modal__body">
                  <label className="options-modal__row" id="optionExperimental">
                    <span className="options-modal__row-label">
                      {(t.advancedMode as string) || 'Experimental Mode'}
                    </span>
                    <input
                      type="checkbox"
                      id="experimentalModeToggle"
                      className="options-modal__switch"
                      checked={isAdvancedMode}
                      onChange={handleAdvancedModeToggle}
                    />
                  </label>

                  {isAdvancedMode && !isMobileDevice() && (
                    <button
                      type="button"
                      className="options-modal__item"
                      id="optionConverter"
                      onClick={() => {
                        onOpenConverter();
                        setOptionsVisible(false);
                      }}
                    >
                      {((t.converter as Record<string, string>)?.title) || 'Script Converter'}
                    </button>
                  )}

                  <button
                    type="button"
                    className="options-modal__item"
                    id="optionAbout"
                    onClick={() => {
                      onOpenAbout();
                      setOptionsVisible(false);
                    }}
                  >
                    {(t.about as string) || 'About'}
                  </button>

                  {isAdvancedMode && (
                    <button
                      type="button"
                      className="options-modal__item"
                      id="optionExperimentalOptions"
                      ref={experimentalEntryRef}
                      onClick={() => setOptionsView('experimental')}
                      aria-haspopup="true"
                    >
                      {(t.experimentalOptions as string) || 'Experimental options'}
                    </button>
                  )}
                </div>
              </>
            )}

            {optionsView === 'experimental' && (
              <>
                <div className="options-modal__header">
                  <button
                    type="button"
                    className="options-modal__close"
                    onClick={() => {
                      shouldReturnFocusRef.current = true;
                      setOptionsView('main');
                    }}
                    aria-label={(t.experimentalOptionsBack as string) || 'Back to options'}
                  >
                    ‹
                  </button>
                  <h2 id="experimentalOptionsTitle">
                    {(t.experimentalOptionsTitle as string) || 'Experimental options'}
                  </h2>
                  <button
                    type="button"
                    className="options-modal__close modal-close-icon"
                    onClick={() => setOptionsVisible(false)}
                    aria-label={(t.closeButton as string) || 'Close'}
                  >
                    ✕
                  </button>
                </div>

                <div className="options-modal__body">
                  <label className="options-modal__row" id="optionLoginEnabled">
                    <span className="options-modal__row-label">
                      {(t.loginEnabled as string) || 'Login / Profile'}
                    </span>
                    <input
                      type="checkbox"
                      id="loginEnabledToggle"
                      className="options-modal__switch"
                      checked={isLoginEnabled}
                      onChange={(e) => setLoginEnabled(e.target.checked)}
                    />
                  </label>

                  <label className="options-modal__row" id="optionCustomScriptInput">
                    <span className="options-modal__row-label">
                      {(t.customScriptInput as string) || 'Custom script input (paste / file)'}
                    </span>
                    <input
                      type="checkbox"
                      id="customScriptInputToggle"
                      className="options-modal__switch"
                      checked={isCustomScriptInputEnabled}
                      onChange={(e) => setCustomScriptInputEnabled(e.target.checked)}
                    />
                  </label>

                  <label className="options-modal__row" id="optionCopyButton">
                    <span className="options-modal__row-label">
                      {(t.copyButtonEnabled as string) || 'Copy line button (in Practice Mode)'}
                    </span>
                    <input
                      type="checkbox"
                      id="copyButtonToggle"
                      className="options-modal__switch"
                      checked={isCopyButtonEnabled}
                      onChange={(e) => setCopyButtonEnabled(e.target.checked)}
                    />
                  </label>

                  <button
                    type="button"
                    className="options-modal__item"
                    id="optionAudioTest"
                    onClick={() => {
                      onOpenAudioTest();
                      setOptionsVisible(false);
                    }}
                  >
                    Audio Test
                  </button>

                  <button
                    type="button"
                    className="options-modal__item"
                    id="optionTtsTest"
                    onClick={() => {
                      onOpenTtsTest();
                      setOptionsVisible(false);
                    }}
                  >
                    TTS Test
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
