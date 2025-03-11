const app = document.getElementById('app');
let extractedLines = [];
let currentLineIndex = 0;
let scriptLines = [];
let precedingCount = 0;

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

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
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
    <p>${t.description}</p>
    <div class="input-tabs">
      <button class="tab-btn" data-tab="paste">📝 ${t.pasteModeTab}</button>
      <button class="tab-btn" data-tab="file">📁 ${t.fileModeTab}</button>
      <button class="tab-btn active" data-tab="library">📚 ${t.libraryModeTab}</button>
    </div>
    <div class="tab-content hidden" id="paste-tab">
      <textarea id="scriptInput" rows="10" placeholder="${t.scriptPlaceholder}"></textarea>
    </div>
    <div class="tab-content hidden" id="file-tab">
      <input type="file" id="scriptFile" accept=".script">
      <p class="help-text">${t.formatHelp}</p>
    </div>
    <div class="tab-content" id="library-tab">
      <select id="scriptLibrary">
        <option value="">${t.selectScript}</option>
      </select>
    </div>
    <input type="text" id="characterName" placeholder="${t.characterPlaceholder}">
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
      document.getElementById(`${tab.dataset.tab}-tab`).classList.remove('hidden');
    });
  });

  document.getElementById('scriptFile').addEventListener('change', handleFileUpload);
  document.getElementById('scriptLibrary').addEventListener('change', handleLibrarySelection);
  document.getElementById('extractButton').addEventListener('click', extractLines);

  // Update library script loading
  const librarySelect = document.getElementById('scriptLibrary');
  ScriptLibrary.getAvailableScripts().forEach(({id, title, format}) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `${title} (${format})`;
    librarySelect.appendChild(option);
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
    const selectedScript = await ScriptLibrary.loadScript(event.target.value);
    if (!selectedScript) {
      showToast("Error: Script not found");
      return;
    }
    
    // Use the content directly rather than switching tabs
    scriptLines = ScriptProcessor.preProcessScript(
      selectedScript.content || selectedScript.text
    );
    
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
  const scriptLibrary = document.getElementById('scriptLibrary');
  const character = document.getElementById('characterName').value.trim();
  
  let scriptText = '';
  
  // Get text from active tab
  if (!document.getElementById('paste-tab').classList.contains('hidden')) {
    scriptText = scriptInput.value;
  } else if (!document.getElementById('file-tab').classList.contains('hidden')) {
    // Handle structured format from file
    if (!scriptFile.files[0]) {
      showToast(t.errorNoInput);
      return;
    }
    const reader = new FileReader();
    reader.readAsText(scriptFile.files[0]);
    scriptText = reader.result;
  } else {
    // Library mode is active
    if (!scriptLibrary.value) {
      showToast(t.errorNoInput);
      return;
    }
    const selectedScript = ScriptLibrary.scripts.get(scriptLibrary.value);
    scriptText = selectedScript.content;
  }

  if (!scriptText || !character) {
    showToast(t.errorNoInput);
    return;
  }
  
  scriptLines = ScriptProcessor.preProcessScript(scriptText);
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
    await ScriptLibrary.initialize();
    renderInputView();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showToast('Error loading scripts');
  }
}

document.addEventListener('DOMContentLoaded', initializeApp);