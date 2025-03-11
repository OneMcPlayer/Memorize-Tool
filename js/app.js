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
      <button class="tab-btn active" data-tab="paste">📋 ${t.pasteModeTab}</button>
      <button class="tab-btn" data-tab="file">📁 ${t.fileModeTab}</button>
      <button class="tab-btn" data-tab="library">📚 ${t.libraryModeTab}</button>
    </div>
    <div class="tab-content" id="paste-tab">
      <textarea id="scriptInput" rows="10" placeholder="${t.scriptPlaceholder}"></textarea>
    </div>
    <div class="tab-content hidden" id="file-tab">
      <input type="file" id="scriptFile" accept=".txt,.script,.md">
      <p class="help-text">${t.formatHelp}</p>
    </div>
    <div class="tab-content hidden" id="library-tab">
      <select id="scriptLibrary">
        <option value="">${t.selectScript}</option>
      </select>
    </div>
    <input type="text" id="characterName" placeholder="${t.characterPlaceholder}">
    <div class="format-options">
      <label>
        <input type="radio" name="format" value="plain" checked> ${t.plainText}
      </label>
      <label>
        <input type="radio" name="format" value="structured"> ${t.structuredFormat}
      </label>
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

const sampleLibrary = {
  hamlet: {
    title: "Hamlet",
    text: `HAMLET: To be, or not to be, that is the question...`
  },
  macbeth: {
    title: "Macbeth",
    text: `MACBETH: Tomorrow, and tomorrow, and tomorrow...`
  }
};

function setupInputHandlers() {
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

  // Add sample scripts to library dropdown
  const librarySelect = document.getElementById('scriptLibrary');
  Object.entries(sampleLibrary).forEach(([id, script]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = script.title;
    librarySelect.appendChild(option);
  });
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    if (document.querySelector('input[name="format"]:checked').value === 'structured') {
      parseStructuredScript(content);
    } else {
      document.getElementById('scriptInput').value = content;
    }
  };
  reader.readAsText(file);
}

function handleLibrarySelection(event) {
  const selectedScript = sampleLibrary[event.target.value];
  if (selectedScript) {
    document.getElementById('scriptInput').value = selectedScript.text;
    // Switch to paste tab after selection
    document.querySelector('[data-tab="paste"]').click();
  }
}

function parseStructuredScript(content) {
  try {
    const script = {
      metadata: {},
      roles: [],
      scenes: []
    };

    const lines = content.split('\n');
    let currentSection = null;
    let currentScene = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('@')) {
        const [tag, ...value] = trimmed.substring(1).split(' ');
        
        switch (tag) {
          case 'title':
          case 'author':
          case 'date':
            script.metadata[tag] = value.join(' ');
            break;
          case 'roles':
            currentSection = 'roles';
            break;
          case 'scene':
            currentScene = { context: '', description: '', dialogue: [] };
            script.scenes.push(currentScene);
            currentSection = 'scene';
            break;
          case 'action':
            if (currentScene) {
              currentScene.dialogue.push({ type: 'action', text: value.join(' ') });
            }
            break;
        }
      } else if (trimmed && currentSection) {
        switch (currentSection) {
          case 'roles':
            if (trimmed.includes(':')) {
              const [name, desc] = trimmed.split(':').map(s => s.trim());
              script.roles.push({ name, description: desc });
            }
            break;
          case 'scene':
            if (trimmed.includes('":')) {
              const [character, ...text] = trimmed.split('":');
              currentScene.dialogue.push({
                type: 'dialogue',
                character: character.trim(),
                text: text.join('":').trim().replace(/^"""|"""$/g, '')
              });
            }
            break;
        }
      }
    });

    return script;
  } catch (error) {
    console.error('Error parsing structured script:', error);
    return null;
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
function preProcessScript(scriptText) {
  // First, normalize line endings and remove multiple empty lines
  let text = scriptText.replace(/\r\n/g, '\n')
                      .replace(/\n{3,}/g, '\n\n');
  
  let lines = text.split('\n');
  let processedLines = [];
  let currentLine = '';
  let lastCharacterName = '';
  let isStageDirection = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      if (currentLine) {
        processedLines.push(currentLine);
        currentLine = '';
      }
      continue;
    }

    // Check for stage directions (text in parentheses)
    if (line.startsWith('(')) {
      isStageDirection = true;
    }

    // Check if this line starts with a character name (all caps)
    const characterMatch = line.match(/^([A-Z][A-Z\s]+)(?:\s*:?\s*)(.*)/);
    
    if (characterMatch && !isStageDirection) {
      // If we have a pending line, save it
      if (currentLine) {
        processedLines.push(currentLine);
      }
      
      // Start new line with character name
      lastCharacterName = characterMatch[1].trim();
      currentLine = `${lastCharacterName}: ${characterMatch[2]}`;
    } else {
      // If line is part of stage direction or previous dialogue
      if (currentLine) {
        // Add space only if needed
        const connector = currentLine.endsWith('-') ? '' : 
                        (currentLine.endsWith('(') || line.startsWith(')')) ? '' : ' ';
        currentLine += connector + line;
      } else if (lastCharacterName && !isStageDirection) {
        // If we have a last known character but no current line
        currentLine = `${lastCharacterName}: ${line}`;
      } else {
        // Store stage directions or other text as is
        currentLine = line;
      }
    }

    // Reset stage direction flag if line ends with ')'
    if (line.endsWith(')')) {
      isStageDirection = false;
    }
  }

  // Don't forget the last line
  if (currentLine) {
    processedLines.push(currentLine);
  }

  return processedLines;
}

function extractLines() {
  const t = translations[currentLang];
  const scriptText = document.getElementById('scriptInput').value;
  const character = document.getElementById('characterName').value.trim();
  
  if (!scriptText || !character) {
    showToast(t.errorNoInput);
    return;
  }
  
  // Pre-process the script to handle broken lines
  scriptLines = preProcessScript(scriptText);
  precedingCount = parseInt(document.getElementById('precedingCount').value) || 0;

  // Escape special characters in character name for regex
  const escapedCharacter = character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^\\s*${escapedCharacter}\\b\\s*:?`, "i");
  
  extractedLines = [];
  for (let i = 0; i < scriptLines.length; i++) {
    if (regex.test(scriptLines[i])) {
      extractedLines.push({ index: i, line: scriptLines[i] });
    }
  }

  if (extractedLines.length === 0) {
    showToast(t.errorNoLines + character);
    return;
  }
  
  currentLineIndex = 0;
  renderPracticeView();
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
      navigator.clipboard.writeText(currentEntry.line)
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
renderInputView();