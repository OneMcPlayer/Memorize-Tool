import { showToast, handleSwipeGesture } from '/Memorize-Tool/js/utils.js';
import { translations } from '/Memorize-Tool/js/translations.js';
import { Script } from '/Memorize-Tool/js/models/Script.js';
import { ScriptProcessor } from '/Memorize-Tool/js/services/ScriptProcessor.js';
import scriptLibrary from '/Memorize-Tool/js/data/scriptLibraryInstance.js';

const app = document.getElementById('app');
let extractedLines = [];
let currentLineIndex = 0;
let scriptLines = [];
let precedingCount = 0;
let isAdvancedMode = localStorage.getItem('advancedMode') === 'true';

// Load saved language and theme from localStorage
let currentLang = localStorage.getItem('lang') || 'en';
const langSelect = document.getElementById('languageSelect');
const themeToggle = document.getElementById('themeToggle');

langSelect.value = currentLang;
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
}

// Event listeners for language, theme, touch, and keyboard
langSelect.addEventListener('change', (e) => {
  currentLang = e.target.value;
  localStorage.setItem('lang', currentLang);
  renderInputView();
});

// NEW: Options menu toggle logic
const optionsToggle = document.getElementById('optionsToggle');
const optionsMenu = document.getElementById('optionsMenu');

optionsToggle.addEventListener('click', () => {
  if (optionsMenu.style.display === 'none' || optionsMenu.style.display === '') {
    optionsMenu.style.display = 'block';
  } else {
    optionsMenu.style.display = 'none';
  }
});

// Optionally hide the menu if clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#optionsToggle') && !e.target.closest('#optionsMenu')) {
    optionsMenu.style.display = 'none';
  }
});

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
});

document.getElementById('optionsMenu').innerHTML = `
  <ul>
    <li id="optionAdvanced">
      <label>
        <input type="checkbox" id="advancedModeToggle" ${isAdvancedMode ? 'checked' : ''}>
        ${translations[currentLang].advancedMode}
      </label>
    </li>
    <li id="optionAbout">About</li>
    <li id="optionHelp">Help</li>
  </ul>
`;

document.getElementById('advancedModeToggle').addEventListener('change', (e) => {
  isAdvancedMode = e.target.checked;
  localStorage.setItem('advancedMode', isAdvancedMode);
  renderInputView();
});

let touchStartX = 0;
document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
});
document.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].screenX;
  handleSwipeGesture(touchStartX, touchEndX, {
    onRight: () => document.getElementById('revealButton')?.click(),
    onLeft: () => document.getElementById('nextButton')?.click()
  });
});

document.addEventListener('keydown', handleKeyPress);

/*************************************************************
 * RENDER VIEWS
 *************************************************************/
function renderInputView() {
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
    <select id="roleSelect">
      <option value="">${t.selectRole}</option>
    </select>
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

async function setupInputHandlers() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.add('hidden'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-tab`)?.classList.remove('hidden');
    });
  });

  const fileInput = document.getElementById('scriptFile');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }

  const librarySelect = document.getElementById('scriptLibrary');
  if (librarySelect) {
    librarySelect.addEventListener('change', handleLibrarySelection);
  }

  const extractButton = document.getElementById('extractButton');
  if (extractButton) {
    extractButton.addEventListener('click', extractLines);
  }

  // Update library script loading only if we have scripts and a select element
  if (librarySelect) {
    // Replace ScriptLibrary.getAvailableScripts() with scriptLibrary.getAvailableScripts()
    const scripts = scriptLibrary.getAvailableScripts();
    if (scripts && scripts.length) {
      scripts.forEach(({id, title, format}) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${title} (${format})`;
        librarySelect.appendChild(option);
      });
    } else {
      // Add a disabled option if no scripts are available
      const option = document.createElement('option');
      option.value = "";
      option.textContent = "No scripts available";
      option.disabled = true;
      librarySelect.appendChild(option);
    }
  }
}

function populateRoleSelect(roles) {
  const roleSelect = document.getElementById('roleSelect');
  roleSelect.innerHTML = '<option value="">Select Role</option>';
  roles.forEach(role => {
    const option = document.createElement('option');
    // Use the first alias as the role value and list all aliases as the label.
    option.value = role.aliases[0];
    option.textContent = role.aliases.join(' / ');
    roleSelect.appendChild(option);
  });
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    try {
      const script = Script.fromStructuredText(content);
      document.getElementById('scriptInput').value = content;
    } catch (error) {
      showToast("Error: Invalid script format");
      console.error(error);
    }
  };
  reader.readAsText(file);
}

async function handleLibrarySelection(event) {
  try {
    const scriptId = event.target.value;
    if (!scriptId) return;

    // Replace ScriptLibrary with the imported instance scriptLibrary
    const selectedScript = await scriptLibrary.loadScript(scriptId);
    if (!selectedScript) {
      showToast("Error: Script not found");
      return;
    }

    // Store the script content and preprocess it
    const content = selectedScript.content || selectedScript.text;
    if (!content) {
      showToast("Error: Script has no content");
      return;
    }

    scriptLines = ScriptProcessor.preProcessScript(content);
    // If the script has roles, update the role select list.
    if (selectedScript.roles && selectedScript.roles.length) {
      populateRoleSelect(selectedScript.roles);
    }
  } catch (error) {
    showToast("Error loading script");
    console.error(error);
  }
}

function renderPracticeView() {
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

/*************************************************************
 * CORE LOGIC
 *************************************************************/
function extractLines() {
  const t = translations[currentLang];
  const scriptInput = document.getElementById('scriptInput');
  const scriptFile = document.getElementById('scriptFile');
  const scriptLibraryEl = document.getElementById('scriptLibrary');
  const roleSelect = document.getElementById('roleSelect');
  const character = roleSelect.value.trim();

  if (!character) {
    showToast(t.errorSelectRole);
    return;
  }

  let currentLines = scriptLines;
  
  // Only process text if we're not using preprocessed lines from library
  if (!document.getElementById('library-tab').classList.contains('hidden')) {
    // Library mode - use existing scriptLines
    if (!scriptLibraryEl.value) {
      showToast(t.errorNoInput);
      return;
    }
  } else if (!document.getElementById('paste-tab').classList.contains('hidden')) {
    // Paste mode
    if (!scriptInput.value) {
      showToast(t.errorNoInput);
      return;
    }
    currentLines = ScriptProcessor.preProcessScript(scriptInput.value);
  } else {
    // File mode
    if (!scriptFile.files[0]) {
      showToast(t.errorNoInput);
      return;
    }
    currentLines = ScriptProcessor.preProcessScript(scriptFile.value);
  }

  if (!currentLines || currentLines.length === 0) {
    showToast(t.errorNoInput);
    return;
  }

  scriptLines = currentLines;
  precedingCount = parseInt(document.getElementById('precedingCount').value) || 0;
  extractedLines = ScriptProcessor.extractCharacterLines(scriptLines, character, precedingCount);

  if (extractedLines.length === 0) {
    showToast(t.errorNoLines + character);
    return;
  }

  currentLineIndex = 0;
  renderPracticeView();
}

function getPlainText(line) {
  // Remove HTML tags and trim whitespace
  return line.replace(/<[^>]*>/g, '').trim();
}

function showCurrentCard(showFull) {
  const t = translations[currentLang];
  const card = document.getElementById('card');
  
  if (currentLineIndex >= extractedLines.length) {
    card.innerHTML = t.complete;
    card.classList.add('revealed');
    document.getElementById('revealButton').style.display = 'none';
    document.getElementById('nextButton').style.display = 'none';
    document.getElementById('restartButton').style.display = 'inline-block';
    document.getElementById('progressIndicator').textContent = '';
    return;
  }

  const currentEntry = extractedLines[currentLineIndex];
  const startIndex = Math.max(0, currentEntry.index - precedingCount);
  const contextLines = scriptLines.slice(startIndex, currentEntry.index);
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
    copyBtn.onclick = () => {
      // Use the original line text for copying
      navigator.clipboard.writeText(getPlainText(currentEntry.line))
        .then(() => showToast(t.copied));
    };
    card.appendChild(copyBtn);
  }
  updateProgress();
}

function nextCard() {
  currentLineIndex++;
  showCurrentCard(false);
}

function updateProgress() {
  const t = translations[currentLang];
  const progress = document.getElementById('progressIndicator');
  progress.textContent = `${t.line} ${currentLineIndex + 1} of ${extractedLines.length}`;
}

/*************************************************************
 * KEYBOARD SHORTCUT HANDLER
 *************************************************************/
function handleKeyPress(e) {
  // Do not trigger shortcuts while typing in text fields
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  
  if (e.key === 'Enter') {
    const nextBtn = document.getElementById('nextButton');
    const extractBtn = document.getElementById('extractButton');
    if (nextBtn && nextBtn.style.display !== 'none') {
      nextBtn.click();
    } else if (extractBtn) {
      extractBtn.click();
    }
  } else if (e.key === ' ') {
    const revealBtn = document.getElementById('revealButton');
    if (revealBtn) {
      e.preventDefault();
      revealBtn.click();
    }
  } else if (e.key === 'Escape') {
    renderInputView();
  }
}

// Finally, start the app by rendering the input view
async function initializeApp() {
  try {
    await scriptLibrary.initialize();
    renderInputView();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showToast('Error loading scripts');
  }
}

document.addEventListener('DOMContentLoaded', initializeApp);