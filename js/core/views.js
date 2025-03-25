import { translations } from '/Memorize-Tool/js/translations.js';
import { currentLang, isAdvancedMode } from './settings.js';
import { setupInputHandlers } from './handlers.js';
import { 
  getCurrentLineData, 
  extractedLines, 
  currentLineIndex, 
  nextLine 
} from './state.js';
import { getPlainText } from './utils.js';
import { showToast } from '/Memorize-Tool/js/utils.js';
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
 * Render the converter view
 */
export function renderConverterView() {
  const t = translations[currentLang].converter || {};
  
  app.innerHTML = `
    <div class="converter-header">
      <button id="converterTopBackButton" class="back-button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${t.backToMain || 'Back to Main'}
      </button>
      <h1>${t.title || 'Script Converter'}</h1>
    </div>
    <p>${t.description || 'Convert plain text scripts to structured format'}</p>
    
    <div class="steps-indicator">
      <div class="step-indicator active" data-step="1">${t.stepInsert || '1. Insert Script'}</div>
      <div class="step-indicator" data-step="2">${t.stepEdit || '2. Edit Details'}</div>
      <div class="step-indicator" data-step="3">${t.stepOutput || '3. Get Output'}</div>
    </div>
    
    <div class="converter-container">
      <!-- Step 1: Script Input -->
      <div id="step1-container" class="step-container">
        <div class="converter-input">
          <h2>${t.inputTitle || 'Input Script'}</h2>
          <textarea id="converterInput" rows="12" placeholder="${t.inputPlaceholder || 'Paste your script here...'}"></textarea>
          <div class="center">
            <button class="next-step-btn" data-target="2">${t.continueButton || 'Continue'}</button>
          </div>
        </div>
      </div>
      
      <!-- Step 2: Edit Metadata & Roles -->
      <div id="step2-container" class="step-container" style="display:none">
        <div class="converter-metadata">
          <h2>${t.metadataTitle || 'Script Metadata'}</h2>
          <div class="form-group">
            <label>${t.titleLabel || 'Title'}</label>
            <input type="text" id="scriptTitle">
          </div>
          <div class="form-group">
            <label>${t.authorLabel || 'Author'}</label>
            <input type="text" id="scriptAuthor">
          </div>
          <div class="form-group">
            <label>${t.dateLabel || 'Date'}</label>
            <input type="text" id="scriptDate">
          </div>
          <div class="form-group">
            <label>${t.descriptionLabel || 'Description'}</label>
            <input type="text" id="scriptDescription">
          </div>
        </div>
        
        <h2>${t.rolesTitle || 'Characters'}</h2>
        <div class="converter-roles">
          <div id="rolesContainer"></div>
        </div>
        <button type="button" id="addRoleButton">${t.addRoleButton || 'Add Character'}</button>
        
        <div class="button-group">
          <button class="prev-step-btn" data-target="1">${t.backButton || 'Back'}</button>
          <button id="exportButton" class="next-step-btn" data-target="3">${t.exportButton || 'Generate Script'}</button>
        </div>
      </div>
      
      <!-- Step 3: Output Results -->
      <div id="step3-container" class="step-container" style="display:none">
        <div class="converter-output">
          <h2>${t.outputLabel || 'Structured Output'}</h2>
          <textarea id="converterOutput" rows="12" readonly></textarea>
          <div class="button-group center">
            <button id="copyButton">${t.copyButton || 'Copy to Clipboard'}</button>
            <button id="downloadButton">${t.downloadButton || 'Download File'}</button>
          </div>
        </div>
        
        <div class="button-group">
          <button class="prev-step-btn" data-target="2">${t.editMoreButton || 'Edit More'}</button>
          <button id="converterBackButton">
            ${t.finishButton || 'Finish'}
          </button>
        </div>
      </div>
    </div>
  `;
  
  setupConverterHandlers();
}
