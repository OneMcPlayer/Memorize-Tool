import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../data/translations';
import { showToast, copyToClipboard, debounce } from '../../utils';

const ConverterView = ({ onBack }) => {
  const { currentLang } = useAppContext();

  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [metadata, setMetadata] = useState({
    title: '',
    author: '',
    date: '',
    description: ''
  });
  // Unused for now, but will be used in the future
  // eslint-disable-next-line no-unused-vars
  const [roles, setRoles] = useState([]);
  const [detectedCharacters, setDetectedCharacters] = useState([]);
  const [scriptStats, setScriptStats] = useState({
    characters: 0,
    lines: 0,
    words: 0,
    chars: 0
  });

  // Process the script when input changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const processScript = useCallback(debounce((text) => {
    if (!text.trim()) {
      setDetectedCharacters([]);
      setScriptStats({
        characters: 0,
        lines: 0,
        words: 0,
        chars: 0
      });
      return;
    }

    try {
      // Save to localStorage
      localStorage.setItem('script_converter_backup', text);

      // For now, just do some basic processing
      // In a real implementation, we would use the ScriptProcessor service

      // Extract potential character names (lines that end with a colon)
      const characterRegex = /^([A-Z][A-Z\s.']+):/gm;
      const characters = new Set();
      let match;

      while ((match = characterRegex.exec(text)) !== null) {
        characters.add(match[1].trim());
      }

      setDetectedCharacters(Array.from(characters));

      // Calculate basic stats
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const words = text.split(/\s+/).filter(word => word.length > 0);

      setScriptStats({
        characters: characters.size,
        lines: lines.length,
        words: words.length,
        chars: text.length
      });

      // Generate a simple structured output
      // This is a placeholder - the real implementation would use the ScriptConverter
      const structuredOutput = generateStructuredOutput(text, Array.from(characters));
      setOutputText(structuredOutput);

    } catch (error) {
      console.error('Error parsing script:', error);
      showToast(translations[currentLang].errorParse, 3000, 'error');
    }
  }, 500), [metadata]);

  // Initialize with any saved data
  useEffect(() => {
    const savedText = localStorage.getItem('script_converter_backup');
    if (savedText) {
      setInputText(savedText);
      processScript(savedText);
    }
  }, [processScript]);

  // Generate a simple structured output
  const generateStructuredOutput = (text, characters) => {
    const { title, author, date, description } = metadata;

    let output = '';

    // Add metadata
    output += '@title "' + (title || 'Untitled Script') + '"\n';
    if (author) output += '@author "' + author + '"\n';
    if (date) output += '@date "' + date + '"\n';
    if (description) output += '@description "' + description + '"\n\n';

    // Add roles
    output += '@roles {\n';
    characters.forEach(character => {
      output += `  "${character}" {}\n`;
    });
    output += '}\n\n';

    // Add a simple scene
    output += '@scene "Scene 1" {\n';
    output += '  section "Section 1" {\n';
    output += '    dialogue {\n';

    // Extract dialogue lines
    const lines = text.split('\n');
    lines.forEach(line => {
      const match = line.match(/^([A-Z][A-Z\s.']+):\s*(.+)$/);
      if (match) {
        const character = match[1].trim();
        const dialogue = match[2].trim();
        output += `      "${character}": """\n        ${dialogue}\n      """\n\n`;
      }
    });

    output += '    }\n';
    output += '  }\n';
    output += '}\n';

    return output;
  };

  // Handle input text change
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    processScript(text);
  };

  // Handle metadata changes
  const handleMetadataChange = (field, value) => {
    setMetadata({
      ...metadata,
      [field]: value
    });

    // Regenerate output with updated metadata
    processScript(inputText);
  };

  // Handle copy to clipboard
  const handleCopy = () => {
    copyToClipboard(outputText)
      .then(() => showToast(translations[currentLang].copied));
  };

  // Handle download
  const handleDownload = () => {
    const blob = new Blob([outputText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.title || 'script'}.script`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const t = translations[currentLang].converter;

  return (
    <div className="converter-view">
      <h1>{t.title}</h1>
      <p>{t.description}</p>

      <div className="converter-container">
        <div className="input-section">
          <h2>{t.inputLabel}</h2>
          <textarea
            className="script-editor"
            value={inputText}
            onChange={handleInputChange}
            placeholder={t.inputPlaceholder}
            rows={15}
          />

          <div className="script-stats">
            <span>{scriptStats.characters} {scriptStats.characters === 1 ? t.characterSingular : t.characterPlural}</span>
            <span>{scriptStats.lines} {t.statsLines}</span>
            <span>{scriptStats.words} {t.statsWords}</span>
            <span>{scriptStats.chars} {t.statsChars}</span>
          </div>

          <div className="detected-characters">
            <h3>{t.rolesTitle}</h3>
            <div className="character-list">
              {detectedCharacters.length > 0 ? (
                detectedCharacters.map((character, index) => (
                  <div key={index} className="character-item">
                    {character}
                  </div>
                ))
              ) : (
                <p>{t.noCharactersDetected}</p>
              )}
            </div>
          </div>
        </div>

        <div className="output-section">
          <h2>{t.outputLabel}</h2>

          <div className="metadata-editor">
            <h3>{t.metadataTitle}</h3>
            <div className="metadata-field">
              <label>{t.titleLabel}</label>
              <input
                type="text"
                value={metadata.title}
                onChange={(e) => handleMetadataChange('title', e.target.value)}
              />
            </div>
            <div className="metadata-field">
              <label>{t.authorLabel}</label>
              <input
                type="text"
                value={metadata.author}
                onChange={(e) => handleMetadataChange('author', e.target.value)}
              />
            </div>
            <div className="metadata-field">
              <label>{t.dateLabel}</label>
              <input
                type="text"
                value={metadata.date}
                onChange={(e) => handleMetadataChange('date', e.target.value)}
              />
            </div>
            <div className="metadata-field">
              <label>{t.descriptionLabel}</label>
              <textarea
                value={metadata.description}
                onChange={(e) => handleMetadataChange('description', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="structured-output">
            <textarea
              readOnly
              value={outputText}
              rows={15}
            />
          </div>

          <div className="export-actions">
            <button onClick={handleCopy}>
              {t.copyButton}
            </button>
            <button onClick={handleDownload}>
              {t.downloadButton}
            </button>
          </div>
        </div>
      </div>

      <div className="center">
        <button onClick={onBack} className="secondary-btn">
          {translations[currentLang].restartButton}
        </button>
      </div>
    </div>
  );
};

export default ConverterView;
