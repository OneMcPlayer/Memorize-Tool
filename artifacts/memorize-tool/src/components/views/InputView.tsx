import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../data/translations';
import { showToast, readFileContent } from '../../utils';
import ScriptModal from '../common/ScriptModal';
import { getAvailableScripts, getScriptContent, convertJsonScriptToText, JsonScript, ScriptMeta } from '../../data/scripts';
import './InputView.css';

interface InputViewProps {
  onStartPractice: () => void;
  onStartMemorization: () => void;
  onOpenConverter: () => void;
}

const InputView = ({ onStartPractice, onStartMemorization }: InputViewProps) => {
  const {
    currentLang,
    isAdvancedMode,
    isCustomScriptInputEnabled,
    setScriptLines,
    setExtractedLines,
    setPrecedingCount,
    resetScriptState
  } = useAppContext();

  const [scriptInput, setScriptInput] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [contextLines, setContextLines] = useState(5);
  const [selectedLibraryScript, setSelectedLibraryScript] = useState('');
  const [availableScripts, setAvailableScripts] = useState<ScriptMeta[]>([]);
  const [activeTab, setActiveTab] = useState('library');
  const [detectedCharacters, setDetectedCharacters] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showFullScript, setShowFullScript] = useState(false);

  useEffect(() => {
    resetScriptState();
    setAvailableScripts(getAvailableScripts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detectCharacters = (script: string) => {
    const characterRegex = /^([A-Z][A-Z\s.']+):/gm;
    const characters = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = characterRegex.exec(script)) !== null) {
      characters.add(match[1].trim());
    }

    setDetectedCharacters(Array.from(characters));
  };

  const handleScriptInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newScript = e.target.value;
    setScriptInput(newScript);
    if (newScript.trim()) detectCharacters(newScript);
    else setDetectedCharacters([]);
  };

  const handleCharacterNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCharacterName(e.target.value);
  };

  const handleContextLinesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setContextLines(Math.max(0, Math.min(5, value)));
  };

  const handleLibraryScriptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLibraryScript(e.target.value);
    setCharacterName('');

    if (e.target.value) {
      const scriptData = getScriptContent(e.target.value);

      if (scriptData && typeof scriptData === 'object' && (scriptData as JsonScript).lines) {
        const jsonScript = scriptData as JsonScript;
        const characters = [...new Set(jsonScript.lines.map(line => line.speaker))];
        setDetectedCharacters(characters);
        const textContent = convertJsonScriptToText(jsonScript);
        setScriptInput(textContent);
      } else {
        const normalizedContent = (scriptData as string).replace(/\r\n/g, '\n');
        setScriptInput(normalizedContent);
        if (normalizedContent.trim()) detectCharacters(normalizedContent);
      }

      setCurrentStep(2);
    } else {
      setCurrentStep(1);
      setDetectedCharacters([]);
      setScriptInput('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileContent(file);
      setScriptInput(content);
      setActiveTab('paste');
      if (content.trim()) detectCharacters(content);
    } catch {
      const t = translations[currentLang] as Record<string, string>;
      showToast(t.errorReadingFile, 3000, 'error');
    }
  };

  const handleCharacterSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCharacterName(e.target.value);
    if (e.target.value) setCurrentStep(3);
    else setCurrentStep(2);
  };

  const prepareLines = (): boolean => {
    const t = translations[currentLang] as Record<string, string>;

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

    const lines = scriptInput.split('\n');
    setScriptLines(lines);
    setPrecedingCount(contextLines);

    const extracted: Array<{ index: number; line: string; speaker: string }> = [];

    lines.forEach((line, index) => {
      if (!line.trim()) return;

      const match = line.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
      if (match) {
        const speaker = match[1].trim();
        const dialogue = match[2].trim();

        if (speaker.toUpperCase() === characterName.toUpperCase()) {
          extracted.push({ index, line: dialogue, speaker: characterName });
        }
      }
    });

    if (extracted.length === 0) {
      showToast(t.errorNoLines + characterName, 3000, 'error');
      return false;
    }

    setExtractedLines(extracted);
    return true;
  };

  const handleExtract = () => {
    if (prepareLines()) onStartPractice();
  };

  const handleStartMemorizationPractice = () => {
    if (prepareLines()) onStartMemorization();
  };

  const renderInputForm = () => {
    const t = translations[currentLang] as Record<string, string>;

    if (isAdvancedMode) {
      const effectiveTab = isCustomScriptInputEnabled ? activeTab : 'library';
      return (
        <div className="input-form advanced-mode">
          {isCustomScriptInputEnabled && (
            <div className="tabs">
              <button className={`tab-btn ${effectiveTab === 'library' ? 'active' : ''}`}
                onClick={() => setActiveTab('library')}>Library</button>
              <button className={`tab-btn ${effectiveTab === 'paste' ? 'active' : ''}`}
                onClick={() => setActiveTab('paste')}>Paste</button>
              <button className={`tab-btn ${effectiveTab === 'file' ? 'active' : ''}`}
                onClick={() => setActiveTab('file')}>File</button>
            </div>
          )}

          <div className="tab-content">
            {effectiveTab === 'library' && (
              <select id="scriptLibrary" value={selectedLibraryScript}
                onChange={handleLibraryScriptChange}>
                <option value="">Select a script...</option>
                {availableScripts.map(script => (
                  <option key={script.id} value={script.id}>{script.title}</option>
                ))}
              </select>
            )}

            {effectiveTab === 'paste' && (
              <textarea id="scriptInput" value={scriptInput}
                onChange={handleScriptInputChange}
                placeholder={t.scriptPlaceholder} rows={10} />
            )}

            {effectiveTab === 'file' && (
              <div id="scriptFile">
                <input type="file" accept=".txt,.script" onChange={handleFileUpload} />
                <p>Drop your script file here or click to browse</p>
              </div>
            )}
          </div>

          <div className="character-input">
            {detectedCharacters.length > 0 ? (
              <div className="character-select-container">
                <label htmlFor="characterSelect">{t.selectCharacter || 'Select Character'}:</label>
                <select id="characterSelect" value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="character-select">
                  <option value="">{t.selectCharacterPrompt || 'Select a character...'}</option>
                  {detectedCharacters.map((character, index) => (
                    <option key={index} value={character}>{character}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="character-input-container">
                <input type="text" id="characterName" value={characterName}
                  onChange={handleCharacterNameChange}
                  placeholder={t.characterPlaceholder} />
              </div>
            )}
          </div>

          <div className="context-input">
            <input type="number" id="precedingCount" value={contextLines}
              onChange={handleContextLinesChange} min="0" max="5"
              placeholder={t.contextLinesPlaceholder} />
            <p className="help-text">{t.contextHelp}</p>
          </div>

          <div className="center input-actions">
            <button id="extractButton" onClick={handleExtract}>{t.extractButton}</button>
            <button
              id="memorizationButton"
              onClick={handleStartMemorizationPractice}
              className="secondary-btn"
            >
              🎭 {(t as Record<string, string>).memorizationPractice ?? 'Memorization Practice'}
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
      return (
        <div className="input-form basic-mode">
          <div className="step-container">
            <div className="step-header">
              <span className="step-number">1</span>
              <h3>{t.selectScriptStep || 'Select a Script'}</h3>
            </div>
            <select id="scriptLibrary" value={selectedLibraryScript}
              onChange={handleLibraryScriptChange}
              className={currentStep === 1 ? 'active-step' : ''}>
              <option value="">{t.selectScriptPrompt || 'Select a script...'}</option>
              {availableScripts.map(script => (
                <option key={script.id} value={script.id}>{script.title}</option>
              ))}
            </select>

            {selectedLibraryScript && (
              <div className="center script-view-button">
                <button onClick={() => setShowFullScript(true)}
                  className="secondary-btn view-script-btn">
                  {t.viewFullScriptButton || 'View Full Script'}
                </button>
              </div>
            )}
          </div>

          {currentStep >= 2 && (
            <div className="step-container">
              <div className="step-header">
                <span className="step-number">2</span>
                <h3>{t.selectCharacterStep || 'Select Your Character'}</h3>
              </div>
              <div className="character-input">
                {detectedCharacters.length > 0 ? (
                  <div className="character-select-container">
                    <select id="characterSelect" value={characterName}
                      onChange={handleCharacterSelect}
                      className={`character-select ${currentStep === 2 ? 'active-step' : ''}`}>
                      <option value="">{t.selectCharacterPrompt || 'Select a character...'}</option>
                      {detectedCharacters.map((character, index) => (
                        <option key={index} value={character}>{character}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="character-input-container">
                    <input type="text" id="characterName" value={characterName}
                      onChange={handleCharacterNameChange}
                      placeholder={t.characterPlaceholder}
                      className={currentStep === 2 ? 'active-step' : ''} />
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep >= 3 && (
            <div className="step-container">
              <div className="step-header">
                <span className="step-number">3</span>
                <h3>{t.setContextStep || 'Set Context Lines'}</h3>
              </div>
              <div className="context-input">
                <input type="number" id="precedingCount" value={contextLines}
                  onChange={handleContextLinesChange} min="0" max="5"
                  placeholder={t.contextLinesPlaceholder}
                  className={currentStep === 3 ? 'active-step' : ''} />
                <p className="help-text">{t.contextHelp}</p>
              </div>

              <div className="center input-actions">
                <button id="extractButton" onClick={handleExtract} className="primary-btn">
                  <span className="extract-btn-emoji" aria-hidden="true">🚀 </span>
                  <span className="extract-btn-prefix">{t.extractButton.split(' ')[0]} </span>
                  {t.extractButton.split(' ').slice(1).join(' ')}
                </button>
                {isAdvancedMode && (
                  <button
                    id="memorizationButton"
                    onClick={handleStartMemorizationPractice}
                    className="secondary-btn"
                    title={(t as Record<string, string>).memorizationPractice ?? 'Memorization Practice'}
                  >
                    🎭 {(t as Record<string, string>).memorizationPractice ?? 'Memorization Practice'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
  };

  const t = translations[currentLang] as Record<string, string>;

  return (
    <div className="input-view">
      <h1>{t.title}</h1>
      <p dangerouslySetInnerHTML={{ __html: isAdvancedMode ? t.descriptionAdvanced : t.descriptionBasic }} />

      {renderInputForm()}

      <ScriptModal
        isOpen={showFullScript}
        onClose={() => setShowFullScript(false)}
        script={scriptInput}
        title={availableScripts.find(s => s.id === selectedLibraryScript)?.title}
        lang={currentLang}
        isExperimentalMode={isAdvancedMode}
      />
    </div>
  );
};

export default InputView;
