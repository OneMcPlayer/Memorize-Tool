import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../data/translations';

const Header = ({ onOpenConverter, onOpenAbout }) => {
  const { currentLang, setLanguage, toggleDarkMode, isAdvancedMode, setAdvancedMode } = useAppContext();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const optionsMenuRef = useRef(null);
  const optionsToggleRef = useRef(null);

  // Handle language change
  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  // Handle theme toggle
  const handleThemeToggle = () => {
    toggleDarkMode();
  };

  // Handle options toggle
  const handleOptionsToggle = () => {
    setOptionsVisible(!optionsVisible);
  };

  // Handle advanced mode toggle
  const handleAdvancedModeToggle = (e) => {
    setAdvancedMode(e.target.checked);
  };

  // Handle clicks outside the options menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        optionsMenuRef.current &&
        !optionsMenuRef.current.contains(event.target) &&
        optionsToggleRef.current &&
        !optionsToggleRef.current.contains(event.target)
      ) {
        setOptionsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check if the device is mobile based on screen width
  const isMobileDevice = () => {
    return window.innerWidth < 1024; // Consider under 1024px as mobile/tablet
  };

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

          <button
            id="optionsToggle"
            onClick={handleOptionsToggle}
            ref={optionsToggleRef}
            aria-label="Options menu"
          >
            ⚙️
          </button>

          {optionsVisible && (
            <div id="optionsMenu" ref={optionsMenuRef}>
              <ul>
                <li id="optionAdvanced">
                  <label>
                    <input
                      type="checkbox"
                      id="advancedModeToggle"
                      checked={isAdvancedMode}
                      onChange={handleAdvancedModeToggle}
                    />
                    {translations[currentLang]?.advancedMode || 'Advanced Mode'}
                  </label>
                </li>

                {isAdvancedMode && (
                  <li
                    id="optionConverter"
                    onClick={() => {
                      if (isMobileDevice()) {
                        alert(translations[currentLang]?.converter?.mobileNotSupported || 'Converter is only available on desktop devices');
                        return;
                      }
                      onOpenConverter();
                      setOptionsVisible(false);
                    }}
                    style={{ display: isMobileDevice() ? 'none' : 'list-item' }}
                  >
                    {translations[currentLang]?.converter?.title || 'Script Converter'}
                  </li>
                )}

                <li
                  id="optionAbout"
                  onClick={() => {
                    onOpenAbout();
                    setOptionsVisible(false);
                  }}
                >
                  {translations[currentLang]?.about || 'About'}
                </li>


              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
