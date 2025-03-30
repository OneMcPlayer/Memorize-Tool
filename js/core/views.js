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
import { setupConverterHandlers } from './converterModule.js';

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
  
  // If mobile device, show notice and return to main view
  if (isMobileDevice()) {
    showToast(t.mobileNotSupported || 'Converter is only available on desktop devices', 3000, 'warning');
    renderInputView();
    return;
  }
  
  // Add desktop converter class to body for special styling
  document.body.classList.add('converter-view');
  
  app.innerHTML = `
    <div class="converter-header">
      <button id="converterTopBackButton" class="back-button">
        ← ${t.backToMain || 'Back to Main'}
      </button>
      <h1>${t.title || 'Script Converter'}</h1>
    </div>
    
    <div class="steps-indicator">
      <div class="step-indicator active">${t.stepInsert || '1. Insert Script'}</div>
      <div class="step-indicator">${t.stepClean || '2. Clean Script'}</div>
      <div class="step-indicator">${t.stepEdit || '3. Edit Details'}</div>
      <div class="step-indicator">${t.stepOutput || '4. Get Output'}</div>
    </div>
    
    <div class="converter-container">
      <!-- Step 1: Insert Script -->
      <div id="step1-container" class="step-container">
        <div class="converter-input">
          <textarea id="converterInput" rows="12" placeholder="${t.inputPlaceholder || 'Paste your script here...'}"></textarea>
          <div class="button-group center">
            <button id="parseButton">${t.parseButton || 'Parse Script'}</button>
          </div>
        </div>
      </div>
      
      <!-- Step 2: Clean Script (NEW) -->
      <div id="step2-container" class="step-container" style="display:none">
        <div class="converter-clean">
          <h2>${t.cleanTitle || 'Clean & Prepare Script'}</h2>
          <p class="help-text">${t.cleanHelp || 'Review how your script is being parsed. Character dialogues are highlighted.'}</p>
          
          <div id="scriptPreview" class="script-preview"></div>
          
          <div class="detection-summary">
            <h3>${t.detectedCharacters || 'Detected Characters'}</h3>
            <div id="detectedCharactersList" class="detected-characters-list"></div>
          </div>
          
          <div class="button-group">
            <button class="prev-step-btn" data-target="1">${t.backButton || '← Back'}</button>
            <button class="next-step-btn" data-target="3">${t.continueButton || 'Continue →'}</button>
          </div>
        </div>
      </div>
      
      <!-- Step 3: Edit Metadata & Roles (Previously Step 2) -->
      <div id="step3-container" class="step-container" style="display:none">
        <div class="converter-metadata">
          <h2>${t.metadataTitle || 'Script Metadata'}</h2>
          <div class="form-group">
            <label for="scriptTitle">${t.titleLabel || 'Title'}</label>
            <input type="text" id="scriptTitle" class="full-width" required>
          </div>
          <div class="form-group">
            <label for="scriptAuthor">${t.authorLabel || 'Author'}</label>
            <input type="text" id="scriptAuthor" class="full-width">
          </div>
          <div class="form-group">
            <label for="scriptDate">${t.dateLabel || 'Date'}</label>
            <input type="text" id="scriptDate" class="full-width">
          </div>
          <div class="form-group">
            <label for="scriptDescription">${t.descriptionLabel || 'Description'}</label>
            <input type="text" id="scriptDescription" class="full-width">
          </div>
        </div>
        
        <div class="converter-roles">
          <h2>${t.rolesTitle || 'Character Roles'}</h2>
          <p class="help-text">${t.rolesHelp || 'Add all characters in your script including any aliases they might have'}</p>
          
          <div id="rolesContainer"></div>
          
          <button id="addRoleButton">${t.addRoleButton || 'Add Character'}</button>
        </div>
        
        <div class="button-group">
          <button class="prev-step-btn" data-target="2">${t.backButton || '← Back'}</button>
          <button class="next-step-btn" data-target="4">${t.exportButton || 'Export Structured Script'}</button>
        </div>
      </div>
      
      <!-- Step 4: Output (Previously Step 3) -->
      <div id="step4-container" class="step-container" style="display:none">
        <div class="converter-output">
          <textarea id="converterOutput" rows="12" readonly></textarea>
          
          <div class="button-group center">
            <button id="copyButton">${t.copyButton || 'Copy to Clipboard'}</button>
            <button id="downloadButton">${t.downloadButton || 'Download as File'}</button>
          </div>
          
          <button id="converterBackButton">
            ${t.backToMain || 'Back to Main'}
          </button>
        </div>
      </div>
    </div>
  `;
  
  setupConverterHandlers();
}

// Add cleanup when leaving converter view
export function leaveConverterView() {
  document.body.classList.remove('converter-view');
  renderInputView();
}
