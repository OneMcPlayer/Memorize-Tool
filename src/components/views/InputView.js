import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../data/translations';
import { showToast, readFileContent } from '../../utils';
import ScriptModal from '../common/ScriptModal';
import { getAvailableScripts, getScriptContent, convertJsonScriptToText } from '../../data/scripts';
import './InputView.css';

const InputView = ({ onStartPractice, onStartScriptTesting, onStartMemorizationTester, onStartMemorizationPractice }) => {
  const {
    currentLang,
    isAdvancedMode,
    setScriptLines,
    setExtractedLines,
    setPrecedingCount,
    resetScriptState
  } = useAppContext();

  const [scriptInput, setScriptInput] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [contextLines, setContextLines] = useState(5); // Increased from 2 to 5 to show more context
  const [selectedLibraryScript, setSelectedLibraryScript] = useState('');
  const [availableScripts, setAvailableScripts] = useState(() => getAvailableScripts() || []);
  const [activeTab, setActiveTab] = useState('library');
  const [detectedCharacters, setDetectedCharacters] = useState([]);
  const [currentStep, setCurrentStep] = useState(1); // 1: Select Script, 2: Select Character, 3: Set Context Lines
  const [showFullScript, setShowFullScript] = useState(false);

  const scriptCatalog = Array.isArray(availableScripts) ? availableScripts : [];
  const selectedScriptMeta = scriptCatalog.find(script => script.id === selectedLibraryScript);
  const readyForPractice = Boolean(scriptInput.trim() && characterName.trim());

  // Reset script state when component mounts
  useEffect(() => {
    resetScriptState();

    // Load available scripts from library
    setAvailableScripts(getAvailableScripts() || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle script input change
  const handleScriptInputChange = (e) => {
    const newScript = e.target.value;
    setScriptInput(newScript);

    // Detect characters in the script
    if (newScript.trim()) {
      detectCharacters(newScript);
    } else {
      setDetectedCharacters([]);
    }
  };

  // Detect characters in the script
  const detectCharacters = (script) => {
    // Regular expression to find character names (lines that end with a colon)
    const characterRegex = /^([A-Z][A-Z\s.']+):/gm;
    const characters = new Set();
    let match;

    while ((match = characterRegex.exec(script)) !== null) {
      const character = match[1].trim();
      characters.add(character);
    }

    const detectedChars = Array.from(characters);
    setDetectedCharacters(detectedChars);
  };

  // Handle character name change
  const handleCharacterNameChange = (e) => {
    setCharacterName(e.target.value);
  };

  // Handle context lines change
  const handleContextLinesChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setContextLines(Math.max(0, Math.min(5, value)));
  };

  // Handle library script selection
  const handleLibraryScriptChange = (e) => {
    setSelectedLibraryScript(e.target.value);
    setCharacterName(''); // Reset character selection when script changes

    // Load script content and detect characters
    if (e.target.value) {
      // Get the script content (could be JSON or text)
      const scriptData = getSampleScriptContent(e.target.value);

      // Check if we have a JSON script
      if (scriptData && scriptData.lines) {
        // For JSON scripts, extract characters directly
        const characters = [...new Set(scriptData.lines.map(line => line.speaker))];
        setDetectedCharacters(characters);

        // Convert JSON to text format for display and processing
        const textContent = convertJsonScriptToText(scriptData);
        setScriptInput(textContent);


      } else {
        // For text scripts (backward compatibility)
        // Make sure we're using the correct line endings
        const normalizedContent = scriptData.replace(/\r\n/g, '\n');
        setScriptInput(normalizedContent);

        if (normalizedContent.trim()) {
          detectCharacters(normalizedContent);
        }
      }

      setCurrentStep(2); // Move to character selection step
    } else {
      setCurrentStep(1); // Stay on script selection if no script selected
      setDetectedCharacters([]);
      setScriptInput('');
    }
  };

  // Get script content from the script library
  const getSampleScriptContent = (scriptId) => {
    return getScriptContent(scriptId);
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const content = await readFileContent(file);
      setScriptInput(content);
      setActiveTab('paste');

      // Detect characters in the uploaded script
      if (content.trim()) {
        detectCharacters(content);
      }
    } catch (error) {
      showToast(translations[currentLang].errorReadingFile, 3000, 'error');
    }
  };



  // Handle character selection
  const handleCharacterSelect = (e) => {
    setCharacterName(e.target.value);
    if (e.target.value) {
      setCurrentStep(3); // Move to context lines step
    } else {
      setCurrentStep(2); // Stay on character selection if no character selected
    }
  };

  const preparePracticeData = () => {
    const t = translations[currentLang];

    // Validate inputs
    if (activeTab === 'paste' && (!scriptInput.trim() || !characterName.trim())) {
      showToast(t.errorNoInput, 3000, 'error');
      return false;
    }

    if (activeTab === 'library' && (!selectedLibraryScript || !characterName.trim())) {
      showToast(t.errorNoInput, 3000, 'error');
      return false;
    }

    if (activeTab === 'file' && (!scriptInput.trim() || !characterName.trim())) {
      showToast(t.errorNoInput, 3000, 'error');
      return false;
    }

    // Process script and extract lines for the selected character

    // Split the script into lines - ensure we're using the correct line separator
    const lines = scriptInput.split('\n');


    // Set the script lines in the context
    setScriptLines(lines);

    // Set preceding count
    setPrecedingCount(contextLines);

    // Extract lines for the selected character
    const extractedLines = [];



    lines.forEach((line, index) => {
      // Skip empty lines
      if (!line.trim()) return;

      // Check if this line belongs to the selected character
      // Look for character name followed by colon at the beginning of the line
      // This handles cases where there might be colons in the dialogue
      const match = line.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
      if (match) {
        const speaker = match[1].trim();
        const dialogue = match[2].trim();

        // Case-insensitive comparison to be more forgiving
        if (speaker.toUpperCase() === characterName.toUpperCase()) {
          extractedLines.push({
            index,
            line: dialogue,
            speaker: characterName
          });
        }
      }
    });

    // If no lines were found, show an error
    if (extractedLines.length === 0) {
      showToast(t.errorNoLines + characterName, 3000, 'error');
      return false;
    }

    setExtractedLines(extractedLines);

    return true;
  };

  // Handle extract button click
  const handleExtract = () => {
    if (!preparePracticeData()) return;

    // Start practice
    onStartPractice();
  };

  const handleStartMemorizationPractice = () => {
    if (!preparePracticeData()) return;
    onStartMemorizationPractice();
  };

  // Render the appropriate input form based on mode
  const renderInputForm = () => {
    const t = translations[currentLang];

    if (isAdvancedMode) {
      return (
        <div className="input-form advanced-mode">
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`}
              onClick={() => setActiveTab('library')}
            >
              Library
            </button>
            <button
              className={`tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
              onClick={() => setActiveTab('paste')}
            >
              Paste
            </button>
            <button
              className={`tab-btn ${activeTab === 'file' ? 'active' : ''}`}
              onClick={() => setActiveTab('file')}
            >
              File
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'library' && (
              <select
                id="scriptLibrary"
                value={selectedLibraryScript}
                onChange={handleLibraryScriptChange}
              >
                <option value="">Select a script...</option>
                {scriptCatalog.map(script => (
                  <option key={script.id} value={script.id}>
                    {script.title}
                  </option>
                ))}
              </select>
            )}

            {activeTab === 'paste' && (
              <textarea
                id="scriptInput"
                value={scriptInput}
                onChange={handleScriptInputChange}
                placeholder={t.scriptPlaceholder}
                rows={10}
              />
            )}

            {activeTab === 'file' && (
              <div id="scriptFile">
                <input
                  type="file"
                  accept=".txt,.script"
                  onChange={handleFileUpload}
                />
                <p>Drop your script file here or click to browse</p>
              </div>
            )}
          </div>

          <div className="character-input">
            {detectedCharacters.length > 0 ? (
              <div className="character-select-container">
                <label htmlFor="characterSelect">{t.selectCharacter || 'Select Character'}:</label>
                <select
                  id="characterSelect"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="character-select"
                >
                  <option value="">{t.selectCharacterPrompt || 'Select a character...'}</option>
                  {detectedCharacters.map((character, index) => (
                    <option key={index} value={character}>
                      {character}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="character-input-container">
                <input
                  type="text"
                  id="characterName"
                  value={characterName}
                  onChange={handleCharacterNameChange}
                  placeholder={t.characterPlaceholder}
                />
              </div>
            )}
          </div>

          <div className="context-input">
            <input
              type="number"
              id="precedingCount"
              value={contextLines}
              onChange={handleContextLinesChange}
              min="0"
              max="5"
              placeholder={t.contextLinesPlaceholder}
            />
            <p className="help-text">{t.contextHelp}</p>
          </div>

          <div className="center">
            <button id="extractButton" onClick={handleExtract}>
              {t.extractButton}
            </button>
            <button id="memorizationPracticeButton" onClick={handleStartMemorizationPractice} className="memorization-practice-button">
              {t.memorizationPracticeButton || 'Interactive Practice'}
            </button>
          </div>

          <div className="shortcuts-info">
            <p>{t.shortcuts}</p>
            <ul>
              <li>{t.shortcutExtract}</li>
              <li>{t.shortcutReveal}</li>
              <li>{t.shortcutRestart}</li>
            </ul>
          </div>
        </div>
      );
    } else {
      // Basic mode - Iterative approach
      return (
        <div className="input-form basic-mode">
          <div className={`setup-overview ${readyForPractice ? 'ready' : ''}`}>
            <p className="setup-overview-kicker">
              {t.stableSetupTitle || 'Stable rehearsal flow'}
            </p>
            <p className="setup-overview-text">
              {t.stableSetupDescription || 'Choose the script, select your role, then start the standard practice mode. Experimental tools stay available when you want to try them.'}
            </p>
            <div className="setup-overview-grid">
              <div className={`setup-pill ${selectedScriptMeta ? 'complete' : ''}`}>
                <span className="setup-pill-label">{t.setupScriptLabel || 'Script'}</span>
                <strong>{selectedScriptMeta?.title || t.setupPending || 'To choose'}</strong>
              </div>
              <div className={`setup-pill ${characterName ? 'complete' : ''}`}>
                <span className="setup-pill-label">{t.setupCharacterLabel || 'Character'}</span>
                <strong>{characterName || t.setupPending || 'To choose'}</strong>
              </div>
              <div className={`setup-pill ${currentStep >= 3 ? 'complete' : ''}`}>
                <span className="setup-pill-label">{t.setupContextLabel || 'Context'}</span>
                <strong>{currentStep >= 3 ? `${contextLines}` : (t.setupPending || 'To choose')}</strong>
              </div>
            </div>
          </div>

          {/* Step 1: Script Selection */}
          <div className={`step-container ${currentStep === 1 ? 'is-active' : ''} ${selectedScriptMeta ? 'is-complete' : ''}`}>
            <div className="step-header">
              <span className="step-number">1</span>
              <h3>{t.selectScriptStep || 'Select a Script'}</h3>
            </div>
            <select
              id="scriptLibrary"
              value={selectedLibraryScript}
              onChange={handleLibraryScriptChange}
              className={currentStep === 1 ? 'active-step' : ''}
            >
              <option value="">{t.selectScriptPrompt || 'Select a script...'}</option>
              {scriptCatalog.map(script => (
                <option key={script.id} value={script.id}>
                  {script.title}
                </option>
              ))}
            </select>

            {selectedScriptMeta && (
              <p className="step-summary">{selectedScriptMeta.title}</p>
            )}

            {/* View Full Script button - only shown after a script is selected */}
            {selectedLibraryScript && (
              <div className="center script-view-button">
                <button
                  onClick={() => setShowFullScript(true)}
                  className="secondary-btn view-script-btn"
                >
                  {t.viewFullScriptButton || 'View Full Script'}
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Character Selection - Only shown after script is selected */}
          {currentStep >= 2 && (
            <div className={`step-container ${currentStep === 2 ? 'is-active' : ''} ${characterName ? 'is-complete' : ''}`}>
              <div className="step-header">
                <span className="step-number">2</span>
                <h3>{t.selectCharacterStep || 'Select Your Character'}</h3>
              </div>
              <div className="character-input">
                {detectedCharacters.length > 0 ? (
                  <div className="character-select-container">
                    <select
                      id="characterSelect"
                      value={characterName}
                      onChange={handleCharacterSelect}
                      className={`character-select ${currentStep === 2 ? 'active-step' : ''}`}
                    >
                      <option value="">{t.selectCharacterPrompt || 'Select a character...'}</option>
                      {detectedCharacters.map((character, index) => (
                        <option key={index} value={character}>
                          {character}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="character-input-container">
                    <input
                      type="text"
                      id="characterName"
                      value={characterName}
                      onChange={handleCharacterNameChange}
                      placeholder={t.characterPlaceholder}
                      className={currentStep === 2 ? 'active-step' : ''}
                    />
                  </div>
                )}
              </div>

              {characterName && (
                <p className="step-summary">{characterName}</p>
              )}
            </div>
          )}

          {/* Step 3: Context Lines - Only shown after character is selected */}
          {currentStep >= 3 && (
            <div className={`step-container ${currentStep === 3 ? 'is-active' : ''} ${readyForPractice ? 'is-complete' : ''}`}>
              <div className="step-header">
                <span className="step-number">3</span>
                <h3>{t.setContextStep || 'Set Context Lines'}</h3>
              </div>
              <div className="context-input">
                <input
                  type="number"
                  id="precedingCount"
                  value={contextLines}
                  onChange={handleContextLinesChange}
                  min="0"
                  max="5"
                  placeholder={t.contextLinesPlaceholder}
                  className={currentStep === 3 ? 'active-step' : ''}
                />
                <p className="help-text">{t.contextHelp}</p>
              </div>

              <div className="practice-ready-card">
                <p className="practice-ready-kicker">{t.readyToPracticeTitle || 'Ready to rehearse'}</p>
                <h4>
                  {characterName}
                  {selectedScriptMeta ? ` · ${selectedScriptMeta.title}` : ''}
                </h4>
                <p className="practice-ready-text">
                  {t.readyToPracticeDescription || 'The standard mode is the fastest way to start learning your part. The experimental mode stays here when you want to try voice tools.'}
                </p>
              </div>

              <div className="center practice-actions">
                <button
                  id="extractButton"
                  onClick={handleExtract}
                  className="primary-btn"
                >
                  {t.startPracticeButton || t.extractButton}
                </button>
                <button
                  id="memorizationPracticeButton"
                  onClick={handleStartMemorizationPractice}
                  className="secondary-btn memorization-practice-button"
                >
                  <span className="experimental-badge">
                    {t.experimentalBadge || 'Experimental'}
                  </span>
                  {t.experimentalPracticeButton || t.memorizationPracticeButton || 'Interactive Practice'}
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }
  };

  const t = translations[currentLang];

  return (
    <div className="input-view">
      <h1>{t.title}</h1>
      <p dangerouslySetInnerHTML={{ __html: isAdvancedMode ? t.descriptionAdvanced : t.descriptionBasic }} />

      {renderInputForm()}

      {/* Script Modal */}
      <ScriptModal
        isOpen={showFullScript}
        onClose={() => setShowFullScript(false)}
        script={scriptInput} // This is the script text that will be displayed
        title={scriptCatalog.find(s => s.id === selectedLibraryScript)?.title}
        lang={currentLang}
      />

    </div>
  );
};

export default InputView;
