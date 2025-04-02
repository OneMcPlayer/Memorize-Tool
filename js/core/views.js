import { translations } from '../translations.js';
import { currentLang, isAdvancedMode } from './settings.js';
import { setupInputHandlers } from './handlers.js';
import { 
  getCurrentLineData, 
  extractedLines, 
  currentLineIndex, 
  nextLine 
} from './state.js';
import { getPlainText } from './utils.js';
import { showToast } from '../utils.js';
import { setupConverterHandlers, setupSimpleConverterHandlers } from './converterModule.js';

// Get the app container element
const app = document.getElementById('app');

/**
 * Render the input view for script selection and configuration
 */
export function renderInputView() {
  const t = translations[currentLang];
  app.innerHTML = `
    <h1>${t.title}</h1>
    <p>${isAdvancedMode ? t.descriptionAdvanced : t.descriptionBasic}</p>
    ${isAdvancedMode ? `
    <div class="input-tabs">
      <button class="tab-btn" data-tab="paste">📝 ${t.pasteModeTab}</button>
      <button class="tab-btn" data-tab="file">📁 ${t.fileModeTab}</button>
      <button class="tab-btn active" data-tab="library">📚 ${t.libraryModeTab}</button>
    </div>
    ` : `
    <div class="input-tabs">
      <button class="tab-btn active" data-tab="library">📚 ${t.libraryModeTab}</button>
    </div>
    `}
    ${isAdvancedMode ? `
    <div class="tab-content hidden" id="paste-tab">
      <textarea id="scriptInput" rows="10" placeholder="${t.scriptPlaceholder}"></textarea>
    </div>
    <div class="tab-content hidden" id="file-tab">
      <input type="file" id="scriptFile" accept=".script">
      <p class="help-text">${t.formatHelp}</p>
    </div>
    ` : ''}
    <div class="tab-content" id="library-tab">
      <select id="scriptLibrary">
        <option value="">${t.selectScript}</option>
      </select>
    </div>
    <div id="roleSelectContainer" style="display: none;">
      <select id="roleSelect">
        <option value="">${t.selectRole}</option>
      </select>
    </div>
    <div class="input-group">
      <input type="number" id="precedingCount" placeholder="${t.contextLinesPlaceholder}" value="1" min="0" max="5">
      <p class="help-text" style="color: #666; font-size: 0.85em; margin: 5px 0 15px;">
        ${t.contextHelp}
      </p>
    </div>
    <div class="center">
      <button id="extractButton">${t.extractButton}</button>
    </div>
    <p style="font-size: 0.8em; margin-top: 20px;">
      ${t.shortcuts}<br>
      ${t.shortcutExtract}<br>
      ${t.shortcutReveal}<br>
      ${t.shortcutRestart}
    </p>
  `;
  
  setupInputHandlers();
  
  // Add event listener for the converter button
  const openConverterButton = document.getElementById('openConverterButton');
  if (openConverterButton) {
    openConverterButton.addEventListener('click', renderSimpleConverterView);
  }
}

/**
 * Renders the practice view with the current line and controls
 */
export function renderPracticeView() {
  const t = translations[currentLang];
  app.innerHTML = `
    <h1>${t.practiceMode}</h1>
    <div id="progressIndicator" class="center"></div>
    <div id="card">${t.pressReveal}</div>
    <div class="center">
      <button id="revealButton">${t.revealButton}</button>
      <button id="nextButton">${t.nextButton}</button>
      <button id="restartButton" style="display: none;">${t.restartButton}</button>
    </div>
  `;
  
  document.getElementById('revealButton').addEventListener('click', () => showCurrentCard(true));
  document.getElementById('nextButton').addEventListener('click', nextCard);
  document.getElementById('restartButton').addEventListener('click', renderInputView);
  
  updateProgress();
  showCurrentCard(false);
}

/**
 * Display the current card with or without the revealed text
 * @param {boolean} showFull - Whether to show the full text
 */
export function showCurrentCard(showFull) {
  const t = translations[currentLang];
  const card = document.getElementById('card');
  
  // Get the current line data
  const lineData = getCurrentLineData();
  if (!lineData) {
    card.innerHTML = t.complete;
    card.classList.add('revealed');
    document.getElementById('revealButton').style.display = 'none';
    document.getElementById('nextButton').style.display = 'none';
    document.getElementById('restartButton').style.display = 'inline-block';
    document.getElementById('progressIndicator').textContent = '';
    return;
  }
  
  const { currentEntry, contextLines } = lineData;
  let displayText = "";

  // Build context lines
  if (contextLines.length > 0) {
    displayText += `<div class="context-section">`;
    contextLines.forEach(line => {
      const match = line.match(/^([^:]+):(.+)$/);
      if (match) {
        displayText += `
          <div class="context-line">
            <span class="character-name">${match[1].trim()}</span>
            <span class="line-text">${match[2].trim()}</span>
          </div>
        `;
      } else {
        displayText += `<div class="context-line">${line}</div>`;
      }
    });
    displayText += `</div>`;
  }

  // Build your line
  let yourLine = currentEntry.line;
  const match = yourLine.match(/^([^:]+):(.+)$/);
  if (match) {
    yourLine = `
      <span class="character-name">${match[1].trim()}</span>
      <span class="line-text">${match[2].trim()}</span>
    `;
  }

  if (!showFull) {
    displayText += `<div class="your-line">${t.line} ${currentLineIndex + 1}: ????????????????</div>`;
    card.classList.remove('revealed');
  } else {
    displayText += `<div class="your-line">${t.line} ${currentLineIndex + 1}: ${yourLine}</div>`;
    card.classList.add('revealed');
  }

  card.innerHTML = displayText;

  // If revealed, add a copy-to-clipboard button
  if (showFull) {
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋';
    copyBtn.style.position = 'absolute';
    copyBtn.style.right = '10px'; 
    copyBtn.style.top = '10px';
    copyBtn.addEventListener('click', () => {
      // Use the original line text for copying
      navigator.clipboard.writeText(getPlainText(currentEntry.line))
        .then(() => showToast(t.copied));
    });
    card.appendChild(copyBtn);
  }
}

/**
 * Move to the next card
 */
export function nextCard() {
  nextLine();
  showCurrentCard(false);
  updateProgress();
}

/**
 * Update the progress indicator
 */
export function updateProgress() {
  const t = translations[currentLang];
  const progress = document.getElementById('progressIndicator');
  progress.textContent = `${t.line} ${currentLineIndex + 1} of ${extractedLines.length}`;
}

/**
 * Check if the device is mobile based on screen width
 * @returns {boolean} true if the device is mobile
 */
function isMobileDevice() {
  return window.innerWidth < 1024; // Consider under 1024px as mobile/tablet
}

/**
 * Render the converter view
 */
export function renderConverterView() {
  // Get translations from the converter object, with fallbacks for missing keys
  const t = translations[currentLang].converter || {};
  const commonT = translations[currentLang];
  
  // If mobile device, show notice and return to main view
  if (isMobileDevice()) {
    showToast(t.mobileNotSupported || 'Converter is only available on desktop devices', 3000, 'warning');
    renderInputView();
    return;
  }
  
  // Add desktop converter class to body for special styling
  document.body.classList.add('converter-view');
  
  // Create a unified converter view with real-time highlighting
  app.innerHTML = `
    <div class="converter-header">
      <button id="converterTopBackButton" class="back-button">
        ← ${t.backToMain || 'Back to Main'}
      </button>
      <h1>${t.title || 'Script Converter'}</h1>
    </div>
    
    <div class="converter-container">
      <!-- Unified converter with editor and preview side by side -->
      <div class="editor-preview-split">
        <!-- Left panel: Editor -->
        <div class="editor-panel">
          <h2>${t.editScriptTitle || 'Edit Script'}</h2>
          <div class="editor-tools">
            <div class="editor-tools-left">
              <button type="button" class="tool-button" title="${t.toolUppercase || 'UPPERCASE'}" data-action="uppercase">
                <i class="fas fa-font"></i> <span class="tool-text">${t.toolUppercase || 'UPPERCASE'}</span>
              </button>
              <button type="button" class="tool-button" title="${t.toolAddCharacter || 'Add Character Name'}" data-action="add-character">
                <i class="fas fa-user-plus"></i> <span class="tool-text">${t.toolAddCharacter || 'Add Character'}</span>
              </button>
            </div>
            <div class="editor-tools-right">
              <div class="script-stats">
                <span id="scriptStats"></span>
              </div>
            </div>
          </div>
          
          <div class="editor-wrapper">
            <textarea id="scriptEditor" class="script-editor" placeholder="${t.editorPlaceholder || 'Enter your script here...'}" spellcheck="true"></textarea>
            <div class="editor-footer">
              <div class="editor-hint-permanent">${t.editorHint || 'Tip: Character names should be followed by a colon (e.g. HAMLET: To be or not to be)'}</div>
            </div>
          </div>
          
          <div class="editor-actions">
            <button id="copyScriptButton">
              <i class="fas fa-copy"></i> ${t.copyButton || 'Copy to Clipboard'}
            </button>
            <button id="downloadScriptButton">
              <i class="fas fa-download"></i> ${t.downloadButton || 'Download'}
            </button>
            <button id="converterBackButton" class="secondary-button">
              ${t.backToMain || 'Back to Main'}
            </button>
          </div>
        </div>
        
        <!-- Right panel: Preview with syntax highlighting -->
        <div class="preview-panel">
          <h2>${t.previewTitle || 'Parsing Preview'}</h2>
          <p class="help-text">${t.previewHelp || 'Character dialogues are highlighted by color. Click any line to edit.'}</p>
          <div id="parsingPreview" class="script-lines"></div>
          <div class="preview-footer">
            <span class="preview-status">${t.previewStatus || 'Preview updates as you type'}</span>
          </div>
        </div>
      </div>
      
      <!-- Character detection panel -->
      <div class="detection-summary card-style">
        <h3><i class="fas fa-users"></i> ${t.detectedCharacters || 'Detected Characters'}</h3>
        <div id="detectedCharactersList" class="detected-characters-list"></div>
      </div>
      
      <!-- Editing tips -->
      <div class="editing-tips card-style">
        <h3><i class="fas fa-lightbulb"></i> ${t.editingTips || 'Editing Tips'}</h3>
        <ul class="tips-list">
          <li>${t.tipCharacterFormat || 'Format character lines as "CHARACTER: Dialogue text"'}</li>
          <li>${t.tipStageDirections || 'Stage directions can be wrapped in parentheses (like this)'}</li>
          <li>${t.tipSelection || 'Click a line in the preview to locate it in the editor'}</li>
          <li>${t.tipCtrlClick || 'Use Ctrl+Click to select multiple lines for merging'}</li>
        </ul>
      </div>
    </div>
  `;
  
  setupConverterHandlers();
}

/**
 * Render the simplified single-page converter view
 */
export function renderSimpleConverterView() {
  // Get translations from the converter object, with fallbacks for missing keys
  const t = translations[currentLang].converter || {};
  const commonT = translations[currentLang];
  
  // If mobile device, show notice and return to main view
  if (isMobileDevice()) {
    showToast(t.mobileNotSupported || 'Converter is only available on desktop devices', 3000, 'warning');
    renderInputView();
    return;
  }
  
  // Add special class to body for styling
  document.body.classList.add('simple-converter-view');
  
  app.innerHTML = `
    <div class="simple-converter-header">
      <button id="simpleConverterBackButton" class="back-button">
        ← ${t.backToMain || 'Back to Main'}
      </button>
      <h1>${t.simpleTitle || 'Script Parser'}</h1>
    </div>
    
    <div class="simple-converter-container">
      <div class="simple-converter-layout">
        <!-- Left side: Editor -->
        <div class="editor-panel">
          <h2>${t.editScriptTitle || 'Edit Script'}</h2>
          <div class="editor-tools">
            <div class="editor-tools-left">
              <button type="button" class="tool-button" title="${commonT.toolUppercase || 'UPPERCASE'}" data-action="uppercase">
                <i class="fas fa-font"></i>
              </button>
              <button type="button" class="tool-button" title="${t.toolAddCharacter || 'Add Character'}" data-action="add-character">
                <i class="fas fa-user-plus"></i>
              </button>
              <button type="button" class="tool-button" title="${t.toolClear || 'Clear'}" data-action="clear">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
            <div class="editor-tools-right">
              <span id="scriptStats" class="script-stats"></span>
            </div>
          </div>
          
          <div class="editor-wrapper">
            <textarea id="scriptEditor" class="script-editor" placeholder="${t.editorPlaceholder || 'Enter your script here...'}" spellcheck="true"></textarea>
          </div>
          
          <div class="editor-footer">
            <div class="editor-hint">
              <i class="fas fa-lightbulb"></i> ${t.editorHint || 'Tip: Character names should be followed by a colon (e.g., HAMLET: To be or not to be)'}
            </div>
            <div class="editor-actions">
              <button id="copyScriptButton">
                <i class="fas fa-copy"></i> ${t.copyButton || 'Copy'}
              </button>
              <button id="downloadScriptButton">
                <i class="fas fa-download"></i> ${t.downloadButton || 'Download'}
              </button>
            </div>
          </div>
        </div>
        
        <!-- Right side: Preview -->
        <div class="preview-panel">
          <h2>${t.previewTitle || 'Parsing Preview'}</h2>
          <div class="preview-description">
            ${t.previewHelp || 'Character dialogues are highlighted by color. Click any line to edit it.'}
          </div>
          
          <div id="parsingPreview" class="parsing-preview"></div>
          
          <div class="characters-panel">
            <h3><i class="fas fa-users"></i> ${t.detectedCharacters || 'Detected Characters'}</h3>
            <div id="detectedCharactersList" class="character-list"></div>
          </div>
        </div>
      </div>
      
      <div class="simple-converter-footer">
        <div class="editing-tips">
          <h3><i class="fas fa-lightbulb"></i> ${t.editingTips || 'Editing Tips'}</h3>
          <ul class="tips-list">
            <li>${t.tipCharacterFormat || 'Format character lines as "CHARACTER: Dialogue text"'}</li>
            <li>${t.tipStageDirections || 'Stage directions can be wrapped in parentheses (like this)'}</li>
            <li>${t.tipSceneHeadings || 'Scene headings like "ACT I" or "SCENE 2" will be formatted specially'}</li>
            <li>${t.tipSelectLine || 'Click any line in the preview to find and edit it in the editor'}</li>
          </ul>
        </div>
      </div>
    </div>
  `;
  
  setupSimpleConverterHandlers();
}

// Add cleanup when leaving converter view
export function leaveConverterView() {
  document.body.classList.remove('converter-view');
  document.body.classList.remove('simple-converter-view');
  renderInputView();
}
