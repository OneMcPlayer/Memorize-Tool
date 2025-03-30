import { translations } from '../translations.js';
import { showToast } from '../utils.js';
import { ScriptConverter } from '../services/ScriptConverter.js';
import { ScriptProcessor } from '../services/ScriptProcessor.js';
import { currentLang } from './settings.js';
import { renderInputView, leaveConverterView } from './views.js';
import { createValidId } from './utils.js';

// Track current step in the conversion process
let currentStep = 1;
let parseResult = null;
let cleanedScriptLines = [];

/**
 * Setup event handlers for the converter view
 */
export function setupConverterHandlers() {
  const parseButton = document.getElementById('parseButton');
  const exportButton = document.getElementById('exportButton');
  const copyButton = document.getElementById('copyButton');
  const downloadButton = document.getElementById('downloadButton');
  const addRoleButton = document.getElementById('addRoleButton');
  const backButton = document.getElementById('converterBackButton');
  const topBackButton = document.getElementById('converterTopBackButton');
  
  if (parseButton) {
    parseButton.addEventListener('click', parseScript);
  }
  
  if (exportButton) {
    exportButton.addEventListener('click', exportScript);
  }
  
  if (copyButton) {
    copyButton.addEventListener('click', copyScriptToClipboard);
  }
  
  if (downloadButton) {
    downloadButton.addEventListener('click', downloadScript);
  }
  
  if (addRoleButton) {
    addRoleButton.addEventListener('click', addNewRoleField);
  }
  
  // Set up back button handlers
  if (backButton) {
    backButton.addEventListener('click', () => {
      parseResult = null;
      cleanedScriptLines = [];
      currentStep = 1;
      leaveConverterView();
    });
  }
  
  if (topBackButton) {
    topBackButton.addEventListener('click', () => {
      if (parseResult || currentStep > 1) {
        if (confirm(translations[currentLang].converter.confirmLeave || 'Leave converter? Your changes will be lost.')) {
          parseResult = null;
          cleanedScriptLines = [];
          currentStep = 1;
          leaveConverterView();
        }
      } else {
        parseResult = null;
        cleanedScriptLines = [];
        currentStep = 1;
        leaveConverterView();
      }
    });
  }
  
  // Setup step navigation
  document.querySelectorAll('.step-container').forEach(container => {
    container.style.display = 'none';
  });
  
  // Show initial step
  showStep(1);
  
  // Add step navigation handlers
  const nextStepButtons = document.querySelectorAll('.next-step-btn');
  nextStepButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetStep = parseInt(button.dataset.target);
      if (targetStep === 2) {
        prepareCleaningView();
      } else if (targetStep === 3) {
        finalizeCleanedScript();
      } else if (targetStep === 4) {
        exportScript();
      } else {
        showStep(targetStep);
      }
    });
  });
  
  const prevStepButtons = document.querySelectorAll('.prev-step-btn');
  prevStepButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetStep = parseInt(button.dataset.target);
      showStep(targetStep);
    });
  });
}

/**
 * Show a specific step and hide others
 */
function showStep(stepNumber) {
  currentStep = stepNumber;
  
  document.querySelectorAll('.step-container').forEach(container => {
    container.style.display = 'none';
  });
  
  const currentContainer = document.getElementById(`step${stepNumber}-container`);
  if (currentContainer) {
    currentContainer.style.display = 'block';
  }
  
  document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
    if (index + 1 === stepNumber) {
      indicator.classList.add('active');
    } else {
      indicator.classList.remove('active');
    }
  });
}

/**
 * Parse the input script text
 */
function parseScript() {
  const t = translations[currentLang];
  const inputText = document.getElementById('converterInput').value;
  
  if (!inputText.trim()) {
    showToast(t.errorNoInput || 'Please enter some script text', 3000, 'error');
    return;
  }
  
  try {
    parseResult = ScriptConverter.parseBasicScript(inputText);
    showStep(2);
    prepareCleaningView(inputText);
  } catch (error) {
    console.error('Error parsing script:', error);
    showToast(t.errorParse || 'Error parsing script', 3000, 'error');
  }
}

/**
 * Prepare the script cleaning view with the parsed script
 * @param {string} originalText - The original unprocessed input text
 */
function prepareCleaningView(originalText = '') {
  if (!parseResult || !parseResult.processedLines) {
    showToast(translations[currentLang].errorParse || 'Invalid script data', 3000, 'error');
    console.error('Error: parseResult is null or missing processedLines');
    return;
  }

  try {
    // Store the processed lines for the preview pane
    cleanedScriptLines = [...parseResult.processedLines];

    // Use the original text for the editor if provided
    setupInteractiveEditor(originalText || cleanedScriptLines.join('\n'));
    updateDetectedCharactersList();
  } catch (error) {
    console.error('Error in prepareCleaningView:', error);
    showToast(translations[currentLang].errorPrepareView || 'Error preparing cleaning view', 3000, 'error');
  }
}

/**
 * Debounce the script parsing to avoid excessive updates
 * Creates a delay to prevent the script parsing from running too frequently when typing
 */
function debounceScriptParsing() {
  if (this.parseTimeout) {
    clearTimeout(this.parseTimeout);
  }
  
  this.parseTimeout = setTimeout(() => {
    updateScriptParsing();
  }, 300); // 300ms delay before executing the actual parsing
}

/**
 * Set up the interactive editor for real-time script editing and parsing
 * @param {string} initialText - The initial text to show in the editor
 */
function setupInteractiveEditor(initialText = '') {
  const scriptPreview = document.getElementById('scriptPreview');
  const t = translations[currentLang];
  
  if (!scriptPreview) return;
  
  scriptPreview.innerHTML = `
    <div class="editor-tools">
      <div class="editor-tools-left">
        <button type="button" class="tool-button" title="${t.toolBold || 'Bold'}" data-action="bold">
          <i class="fas fa-bold"></i> <span class="tool-text">${t.toolBold || 'Bold'}</span>
        </button>
        <button type="button" class="tool-button" title="${t.toolItalic || 'Italic'}" data-action="italic">
          <i class="fas fa-italic"></i> <span class="tool-text">${t.toolItalic || 'Italic'}</span>
        </button>
        <button type="button" class="tool-button" title="${t.toolUppercase || 'UPPERCASE'}" data-action="uppercase">
          <i class="fas fa-font"></i> <span class="tool-text">${t.toolUppercase || 'UPPERCASE'}</span>
        </button>
        <span class="editor-divider"></span>
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
    <div class="editor-preview-container">
      <div class="editor-container">
        <h4>${t.editScriptTitle || 'Edit Script'}</h4>
        <p class="help-text">${t.editScriptHelp || 'Edit the script and see parsing updates in real-time'}</p>
        <div class="editor-wrapper">
          <textarea id="scriptEditor" class="script-editor" placeholder="${t.editorPlaceholder || 'Enter your script here...'}" spellcheck="true"></textarea>
          <div class="editor-footer">
            <div class="editor-hint-permanent">${t.editorHint || 'Tip: Character names should be followed by a colon (e.g. HAMLET: To be or not to be)'}</div>
          </div>
        </div>
      </div>
      <div class="preview-container">
        <h4>${t.previewTitle || 'Parsing Preview'}</h4>
        <p class="help-text">${t.previewHelp || 'Character dialogues are highlighted by color. Click any line to edit.'}</p>
        <div id="parsingPreview" class="script-lines"></div>
        <div class="preview-footer">
          <span class="preview-status">${t.previewStatus || 'Preview updates as you type'}</span>
        </div>
      </div>
    </div>
    <div class="detection-summary card-style">
      <h4><i class="fas fa-users"></i> ${t.detectedCharacters || 'Detected Characters'}</h4>
      <div id="detectedCharactersList" class="detected-characters-list"></div>
    </div>
    <div class="editing-tips card-style">
      <h4><i class="fas fa-lightbulb"></i> ${t.editingTips || 'Editing Tips'}</h4>
      <ul class="tips-list">
        <li>${t.tipCharacterFormat || 'Format character lines as "CHARACTER: Dialogue text"'}</li>
        <li>${t.tipStageDirections || 'Stage directions can be wrapped in parentheses (like this)'}</li>
        <li>${t.tipSelection || 'Click a line in the preview to locate it in the editor'}</li>
        <li>${t.tipCtrlClick || 'Use Ctrl+Click to select multiple lines for merging'}</li>
      </ul>
    </div>
  `;
  
  const scriptEditor = document.getElementById('scriptEditor');
  scriptEditor.value = initialText;
  scriptEditor.addEventListener('input', debounceScriptParsing);
  scriptEditor.addEventListener('keydown', handleEditorKeydown);
  
  // Set up toolbar buttons
  document.querySelectorAll('.tool-button').forEach(button => {
    button.addEventListener('click', () => handleToolAction(button.dataset.action));
  });
  
  updateScriptParsing(); // Call this instead of renderParsingPreview to process the editor content
  updateScriptStats();
}

/**
 * Update script statistics
 */
function updateScriptStats() {
  const scriptEditor = document.getElementById('scriptEditor');
  const statsElement = document.getElementById('scriptStats');
  
  if (!scriptEditor || !statsElement) return;
  
  const text = scriptEditor.value;
  const characters = text.length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const lines = text.split('\n').filter(Boolean).length;
  
  const t = translations[currentLang];
  statsElement.innerHTML = `
    <i class="fas fa-align-left"></i> ${lines} ${t.statsLines || 'lines'} &nbsp;
    <i class="fas fa-font"></i> ${words} ${t.statsWords || 'words'} &nbsp;
    <i class="fas fa-keyboard"></i> ${characters} ${t.statsChars || 'chars'}
  `;
}

/**
 * Handle editor keydown events
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleEditorKeydown(e) {
  // Tab key functionality - insert spaces instead of changing focus
  if (e.key === 'Tab') {
    e.preventDefault();
    const editor = e.target;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    
    // Insert 2 spaces at cursor position
    editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
    
    // Put cursor after the inserted spaces
    editor.selectionStart = editor.selectionEnd = start + 2;
  }
  
  // Update stats on key events
  setTimeout(updateScriptStats, 100);
}

/**
 * Handle toolbar button actions
 * @param {string} action - The action to perform
 */
function handleToolAction(action) {
  const editor = document.getElementById('scriptEditor');
  if (!editor) return;
  
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selectedText = editor.value.substring(start, end);
  
  switch(action) {
    case 'bold':
      // This is just a visual cue since plain text doesn't support formatting
      insertTextAround(editor, '**', '**');
      break;
    case 'italic':
      insertTextAround(editor, '_', '_');
      break;
    case 'uppercase':
      if (selectedText) {
        const newText = selectedText.toUpperCase();
        editor.value = editor.value.substring(0, start) + newText + editor.value.substring(end);
        editor.selectionStart = start;
        editor.selectionEnd = start + newText.length;
        updateScriptParsing();
      }
      break;
    case 'add-character':
      const t = translations[currentLang];
      const characterName = prompt(t.enterCharacterName || 'Enter character name:');
      if (characterName) {
        const formattedText = `${characterName.trim()}: `;
        insertTextAtCursor(editor, formattedText);
      }
      break;
  }
  
  editor.focus();
}

/**
 * Insert text around the selection
 * @param {HTMLElement} editor - The editor element
 * @param {string} before - Text to insert before selection
 * @param {string} after - Text to insert after selection
 */
function insertTextAround(editor, before, after) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selectedText = editor.value.substring(start, end);
  
  if (selectedText) {
    editor.value = editor.value.substring(0, start) + 
                   before + selectedText + after + 
                   editor.value.substring(end);
    editor.selectionStart = start;
    editor.selectionEnd = end + before.length + after.length;
    updateScriptParsing();
  }
}

/**
 * Insert text at cursor position
 * @param {HTMLElement} editor - The editor element
 * @param {string} text - Text to insert
 */
function insertTextAtCursor(editor, text) {
  const start = editor.selectionStart;
  editor.value = editor.value.substring(0, start) + text + editor.value.substring(start);
  editor.selectionStart = editor.selectionEnd = start + text.length;
  updateScriptParsing();
}

/**
 * Update the script parsing based on the current editor content
 */
function updateScriptParsing() {
  const scriptEditor = document.getElementById('scriptEditor');
  if (!scriptEditor) return;
  
  const rawText = scriptEditor.value;
  
  try {
    // Process the raw editor text for the preview only
    // This keeps the original text intact in the editor
    cleanedScriptLines = ScriptProcessor.preProcessScript(rawText, { aggressiveDetection: true });
    renderParsingPreview();
    updateDetectedCharactersList();
    updateScriptStats();
    
    // Enable auto save capability
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('script_converter_backup', rawText);
    }
  } catch (error) {
    console.error('Error parsing script:', error);
    showToast(translations[currentLang].errorParse || 'Error parsing script', 3000, 'error');
  }
}

/**
 * Update the list of detected characters in the script
 */
function updateDetectedCharactersList() {
  const detectedCharactersList = document.getElementById('detectedCharactersList');
  if (!detectedCharactersList) return;
  
  detectedCharactersList.innerHTML = '';
  
  const characters = {};
  
  cleanedScriptLines.forEach(line => {
    const charMatch = line.match(/^([^:]+):/);
    if (charMatch) {
      const character = charMatch[1].trim();
      if (characters[character]) {
        characters[character]++;
      } else {
        characters[character] = 1;
      }
    }
  });
  
  // Count number of unique characters
  const characterCount = Object.keys(characters).length;
  const t = translations[currentLang];
  
  // Add a summary header
  const summary = document.createElement('div');
  summary.className = 'characters-summary';
  summary.innerHTML = `
    <div class="character-count">
      <span class="count-number">${characterCount}</span>
      <span class="count-label">${characterCount === 1 ? t.characterSingular || 'Character' : t.characterPlural || 'Characters'}</span>
    </div>
  `;
  detectedCharactersList.appendChild(summary);
  
  // Add character list wrapper
  const characterListWrapper = document.createElement('div');
  characterListWrapper.className = 'character-list-wrapper';
  detectedCharactersList.appendChild(characterListWrapper);
  
  if (characterCount === 0) {
    characterListWrapper.innerHTML = `
      <div class="no-characters-detected">
        <i class="fas fa-exclamation-circle"></i>
        <p>${t.noCharactersDetected || 'No characters detected. Try adding character names followed by a colon.'}</p>
        <div class="example-format">
          <code>CHARACTER: Dialogue text</code>
        </div>
      </div>
    `;
    return;
  }
  
  Object.entries(characters)
    .sort((a, b) => b[1] - a[1])
    .forEach(([character, count]) => {
      const characterItem = document.createElement('div');
      characterItem.className = 'character-item';
      
      const hash = Array.from(character).reduce((acc, char) => char.charCodeAt(0) + acc, 0);
      const hue = hash % 360;
      const color = `hsl(${hue}, 70%, 60%)`;
      
      characterItem.innerHTML = `
        <div class="character-color" style="background-color: ${color}"></div>
        <span class="character-name" style="color: ${color}">${character}</span>
        <span class="line-count">${count} ${count === 1 ? t.lineSingular || 'line' : t.linePlural || 'lines'}</span>
        <button class="character-action" title="${t.editCharacter || 'Edit this character'}" data-character="${character}">
          <i class="fas fa-pencil-alt"></i>
        </button>
      `;
      
      characterListWrapper.appendChild(characterItem);
    });
    
  // Add event listeners to character action buttons
  document.querySelectorAll('.character-action').forEach(button => {
    button.addEventListener('click', () => {
      const character = button.dataset.character;
      if (character) {
        promptEditCharacter(character);
      }
    });
  });
}

/**
 * Show a dialog to edit a character name
 * @param {string} oldName - The current character name
 */
function promptEditCharacter(oldName) {
  const t = translations[currentLang];
  const newName = prompt(t.editCharacterPrompt || 'Edit character name:', oldName);
  
  if (!newName || newName === oldName) return;
  
  const scriptEditor = document.getElementById('scriptEditor');
  if (!scriptEditor) return;
  
  // Replace all occurrences of the character name in the script
  const regex = new RegExp(`^${oldName}:`, 'gm');
  scriptEditor.value = scriptEditor.value.replace(regex, `${newName}:`);
  
  updateScriptParsing();
  showToast(t.characterRenamed || 'Character renamed successfully', 2000, 'success');
}

/**
 * Render the parsing preview with character detection highlighting
 */
function renderParsingPreview() {
  const parsingPreview = document.getElementById('parsingPreview');
  if (!parsingPreview) return;
  
  parsingPreview.innerHTML = '';
  
  const characterColors = {};
  let colorIndex = 0;
  const colors = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', 
    '#1abc9c', '#d35400', '#34495e', '#16a085', '#c0392b'
  ];
  
  // Group by scene if we detect scene markers
  let currentScene = null;
  let sceneContainer = null;
  
  cleanedScriptLines.forEach((line, index) => {
    // Check for scene markers (patterns like "SCENE 1" or "ACT I")
    const sceneMatch = line.match(/^(ACT|SCENE)\s+([IVX0-9]+)|^ACT\s+([IVX0-9]+),?\s+SCENE\s+([IVX0-9]+)/i);
    
    if (sceneMatch) {
      currentScene = line;
      sceneContainer = document.createElement('div');
      sceneContainer.className = 'script-scene';
      
      const sceneHeader = document.createElement('div');
      sceneHeader.className = 'scene-header';
      sceneHeader.innerHTML = `<i class="fas fa-theater-masks"></i> ${line}`;
      
      sceneContainer.appendChild(sceneHeader);
      parsingPreview.appendChild(sceneContainer);
      return;
    }
    
    // Create line element
    const lineElement = document.createElement('div');
    lineElement.className = 'script-line';
    lineElement.dataset.index = index;
    
    // Add click event for line selection
    lineElement.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Toggle selection for this line
        lineElement.classList.toggle('selected');
      } else {
        // Single click to focus in editor
        focusEditorOnLine(document.getElementById('scriptEditor'), index);
        
        // Highlight this line
        document.querySelectorAll('.script-line.highlighted').forEach(el => {
          el.classList.remove('highlighted');
        });
        lineElement.classList.add('highlighted');
      }
    });
    
    // If we're in a scene, add to scene container
    const container = sceneContainer || parsingPreview;
    
    // Process character lines
    const charMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (charMatch) {
      const character = charMatch[1].trim();
      const dialogue = charMatch[2].trim();
      
      if (!characterColors[character]) {
        const hash = Array.from(character).reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        const hue = hash % 360;
        characterColors[character] = `hsl(${hue}, 70%, 60%)`;
        colorIndex++;
      }
      
      lineElement.innerHTML = `
        <span class="character-name" style="color: ${characterColors[character]}">${character}:</span>
        <span class="dialogue-text">${dialogue}</span>
        <div class="line-actions">
          <button class="line-action-button edit-button" title="${translations[currentLang].editLine || 'Edit this line'}">
            <i class="fas fa-pencil-alt"></i>
          </button>
        </div>
      `;
      lineElement.dataset.character = character;
    } else if (line.startsWith('(') && line.endsWith(')')) {
      // Stage direction
      lineElement.innerHTML = `
        <span class="stage-direction">${line}</span>
        <div class="line-actions">
          <button class="line-action-button edit-button" title="${translations[currentLang].editDirection || 'Edit direction'}">
            <i class="fas fa-pencil-alt"></i>
          </button>
        </div>
      `;
      lineElement.classList.add('direction-line');
    } else {
      lineElement.innerHTML = `
        <span class="plain-text">${line}</span>
        <div class="line-actions">
          <button class="line-action-button edit-button" title="${translations[currentLang].editLine || 'Edit this line'}">
            <i class="fas fa-pencil-alt"></i>
          </button>
        </div>
      `;
    }
    
    container.appendChild(lineElement);
  });
  
  // Add event listeners for line action buttons
  document.querySelectorAll('.line-action-button.edit-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();  // Prevent triggering the parent click event
      const lineElement = button.closest('.script-line');
      if (lineElement) {
        const lineIndex = parseInt(lineElement.dataset.index);
        focusEditorOnLine(document.getElementById('scriptEditor'), lineIndex);
      }
    });
  });
  
  // Add merge button if any lines are selected
  const addMergeButton = () => {
    const selectedLines = document.querySelectorAll('.script-line.selected');
    const mergeButtonContainer = document.getElementById('merge-button-container');
    
    if (mergeButtonContainer) {
      if (selectedLines.length >= 2) {
        mergeButtonContainer.innerHTML = `
          <button id="merge-lines-button" class="action-button">
            <i class="fas fa-object-group"></i> ${translations[currentLang].mergeButton || 'Merge Selected Lines'}
          </button>
        `;
        
        document.getElementById('merge-lines-button').addEventListener('click', mergeSelectedLines);
        mergeButtonContainer.style.display = 'block';
      } else {
        mergeButtonContainer.style.display = 'none';
      }
    }
  };
  
  // Create container for merge button if it doesn't exist
  if (!document.getElementById('merge-button-container')) {
    const container = document.createElement('div');
    container.id = 'merge-button-container';
    container.className = 'merge-button-container';
    container.style.display = 'none';
    parsingPreview.parentElement.appendChild(container);
  }
  
  // Add observer to check for line selection changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.attributeName === 'class' && 
          mutation.target.classList.contains('script-line')) {
        addMergeButton();
      }
    });
  });
  
  document.querySelectorAll('.script-line').forEach(line => {
    observer.observe(line, { attributes: true });
  });
}

/**
 * Focus the editor on a specific line
 * @param {HTMLElement} editor - The editor element
 * @param {number} lineIndex - The index of the line in cleanedScriptLines
 */
function focusEditorOnLine(editor, lineIndex) {
  if (!editor || lineIndex === undefined || lineIndex < 0 || lineIndex >= cleanedScriptLines.length) {
    return;
  }

  const lineToFind = cleanedScriptLines[lineIndex];
  const editorText = editor.value;
  
  // Try to find the exact line in the editor
  const lines = editorText.split('\n');
  let lineStart = 0;
  let exactMatch = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === lineToFind.trim()) {
      exactMatch = i;
      break;
    }
    lineStart += lines[i].length + 1; // +1 for the newline character
  }
  
  if (exactMatch !== -1) {
    // Calculate start and end positions of the line
    lineStart = 0;
    for (let i = 0; i < exactMatch; i++) {
      lineStart += lines[i].length + 1;
    }
    const lineEnd = lineStart + lines[exactMatch].length;
    
    // Set selection and scroll to it
    editor.focus();
    editor.setSelectionRange(lineStart, lineEnd);
    
    // Scroll to make the selection visible
    const lineHeight = 16; // Approximate line height
    const linesVisible = Math.floor(editor.clientHeight / lineHeight);
    const scrollTop = lineHeight * Math.max(0, exactMatch - Math.floor(linesVisible / 2));
    editor.scrollTop = scrollTop;
    
    // Flash the line briefly to highlight it
    const originalValue = editor.value;
    const originalSelStart = editor.selectionStart;
    const originalSelEnd = editor.selectionEnd;
    
    // Add a temporary class to highlight the line
    editor.classList.add('line-highlight');
    
    // Remove the highlight after a short delay
    setTimeout(() => {
      editor.classList.remove('line-highlight');
    }, 1000);
  } else {
    // If exact match not found, try a fuzzy match approach
    // Create a simplified version of the line for matching (remove extra spaces)
    const simplifiedLine = lineToFind.trim().replace(/\s+/g, ' ');
    const lineWords = simplifiedLine.split(' ');
    
    // Look for a line that contains most of the words
    let bestMatch = -1;
    let bestScore = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const simplifiedEditorLine = lines[i].trim().replace(/\s+/g, ' ');
      let score = 0;
      
      lineWords.forEach(word => {
        if (simplifiedEditorLine.includes(word)) {
          score++;
        }
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = i;
      }
    }
    
    if (bestMatch !== -1 && bestScore > Math.min(2, lineWords.length / 2)) {
      // Calculate position
      lineStart = 0;
      for (let i = 0; i < bestMatch; i++) {
        lineStart += lines[i].length + 1;
      }
      const lineEnd = lineStart + lines[bestMatch].length;
      
      // Set selection
      editor.focus();
      editor.setSelectionRange(lineStart, lineEnd);
      
      // Scroll to selection
      const lineHeight = 16;
      const linesVisible = Math.floor(editor.clientHeight / lineHeight);
      const scrollTop = lineHeight * Math.max(0, bestMatch - Math.floor(linesVisible / 2));
      editor.scrollTop = scrollTop;
      
      // Highlight
      editor.classList.add('line-highlight');
      setTimeout(() => {
        editor.classList.remove('line-highlight');
      }, 1000);
    }
  }
}

/**
 * Merge selected lines into a single character dialogue
 */
function mergeSelectedLines() {
  const t = translations[currentLang];
  const selectedLines = document.querySelectorAll('.script-line.selected');
  
  if (selectedLines.length < 2) {
    showToast(t.errorMergeSelection || 'Select at least two lines to merge', 3000, 'error');
    return;
  }
  
  const indices = Array.from(selectedLines).map(line => parseInt(line.dataset.index)).sort((a, b) => a - b);
  
  // Get characters from selected lines
  const characters = new Set();
  indices.forEach(idx => {
    const line = cleanedScriptLines[idx];
    const match = line.match(/^([^:]+):/);
    if (match) characters.add(match[1].trim());
  });
  
  let targetCharacter = null;
  
  // Determine which character to use for the merged line
  if (characters.size === 1) {
    // If all lines are from the same character, use that character
    targetCharacter = Array.from(characters)[0];
  } else if (characters.size > 1) {
    // If multiple characters, let the user choose
    targetCharacter = prompt(
      t.selectCharacterForMerge || 'Multiple characters detected. Which character should speak the merged line?',
      Array.from(characters)[0]
    );
    
    if (!targetCharacter) return; // User cancelled
  } else {
    // No character found, ask user to provide one
    targetCharacter = prompt(t.enterCharacterName || 'Enter character name for merged lines:');
    if (!targetCharacter) return;
  }
  
  // Start building the merged dialogue
  let mergedDialogue = '';
  indices.forEach(idx => {
    const line = cleanedScriptLines[idx];
    const dialogueMatch = line.match(/^([^:]+):\s*(.+)$/);
    
    if (dialogueMatch) {
      // If this is dialogue from the selected character, just add the text
      if (dialogueMatch[1].trim() === targetCharacter) {
        mergedDialogue += ' ' + dialogueMatch[2].trim();
      } else {
        // Otherwise format it as "[CHARACTER: text]" to preserve information
        mergedDialogue += ` [${dialogueMatch[1].trim()}: ${dialogueMatch[2].trim()}]`;
      }
    } else if (line.startsWith('(') && line.endsWith(')')) {
      // Preserve stage directions
      mergedDialogue += ' ' + line.trim();
    } else {
      // For any other line, just add the text
      mergedDialogue += ' ' + line.trim();
    }
  });
  
  mergedDialogue = mergedDialogue.trim();
  
  // Create the merged line with the target character
  const mergedLine = `${targetCharacter}: ${mergedDialogue}`;
  
  // Replace the first line with the merged content
  cleanedScriptLines[indices[0]] = mergedLine;
  
  // Remove the other lines that were merged, starting from the end to avoid index shifting
  for (let i = indices.length - 1; i > 0; i--) {
    cleanedScriptLines.splice(indices[i], 1);
  }
  
  // Apply the changes to the script editor directly
  updateEditorWithCleanedLines();
  
  showToast(t.mergeSuccess || 'Lines merged successfully', 2000, 'success');
}

/**
 * Update the editor content with the current cleanedScriptLines
 */
function updateEditorWithCleanedLines() {
  const scriptEditor = document.getElementById('scriptEditor');
  if (!scriptEditor) return;
  
  // Save cursor position
  const selectionStart = scriptEditor.selectionStart;
  const selectionEnd = scriptEditor.selectionEnd;
  
  // Update content
  scriptEditor.value = cleanedScriptLines.join('\n');
  
  // Restore selection if possible (might not be in the same position)
  scriptEditor.selectionStart = Math.min(selectionStart, scriptEditor.value.length);
  scriptEditor.selectionEnd = Math.min(selectionEnd, scriptEditor.value.length);
  
  // Update UI
  updateScriptParsing();
}

/**
 * Finalize the cleaned script before moving to metadata editing
 */
function finalizeCleanedScript() {
  const scriptEditor = document.getElementById('scriptEditor');
  const t = translations[currentLang];

  if (!scriptEditor) {
    console.error('Error: scriptEditor element not found');
    showToast(t.errorEditorNotFound || 'Editor not found', 3000, 'error');
    return;
  }

  try {
    const rawText = scriptEditor.value;
    
    // Check if there's any content
    if (!rawText.trim()) {
      showToast(t.errorNoInput || 'Please enter some script text', 3000, 'error');
      return;
    }
    
    // Process the raw editor text for the final step with aggressive character detection
    cleanedScriptLines = ScriptProcessor.preProcessScript(rawText, { aggressiveDetection: true });
    
    // Normalize character names (make them consistent)
    normalizeCharacterNames();
    
    // Move to step 3
    showStep(3);
    
    // Extract roles from the cleaned script
    prepareRolesFromDetectedCharacters();
    
    // Show success message
    showToast(t.cleanSuccess || 'Script cleaned successfully', 2000, 'success');
    
    // Backup the final cleaned script
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('script_converter_final', cleanedScriptLines.join('\n'));
    }
  } catch (error) {
    console.error('Error finalizing script:', error);
    showToast(t.errorClean || 'Error processing cleaned script', 3000, 'error');
  }
}

/**
 * Normalize character names throughout the script
 * This helps with cases like "JOHN" vs "John" or "BOB SMITH" vs "Bob Smith"
 */
function normalizeCharacterNames() {
  if (!cleanedScriptLines || cleanedScriptLines.length === 0) return;
  
  // First, collect all character names and count occurrences
  const characterCounts = {};
  const characterVariants = {};
  
  cleanedScriptLines.forEach(line => {
    const match = line.match(/^([^:]+):/);
    if (match) {
      const name = match[1].trim();
      const nameLower = name.toLowerCase();
      
      // Keep track of all variants of the same name
      if (!characterVariants[nameLower]) {
        characterVariants[nameLower] = [name];
      } else if (!characterVariants[nameLower].includes(name)) {
        characterVariants[nameLower].push(name);
      }
      
      // Count occurrences
      if (!characterCounts[name]) {
        characterCounts[name] = 1;
      } else {
        characterCounts[name]++;
      }
    }
  });
  
  // For each lowercase name, find the most common variant
  const normalizedNames = {};
  Object.keys(characterVariants).forEach(lowerName => {
    const variants = characterVariants[lowerName];
    let mostCommonVariant = variants[0];
    let maxCount = characterCounts[variants[0]] || 0;
    
    variants.forEach(variant => {
      const count = characterCounts[variant] || 0;
      if (count > maxCount) {
        maxCount = count;
        mostCommonVariant = variant;
      }
    });
    
    // Use the most common variant for normalization
    variants.forEach(variant => {
      normalizedNames[variant] = mostCommonVariant;
    });
  });
  
  // Replace character names in the script
  cleanedScriptLines = cleanedScriptLines.map(line => {
    const match = line.match(/^([^:]+):/);
    if (match) {
      const name = match[1].trim();
      if (normalizedNames[name] && normalizedNames[name] !== name) {
        return line.replace(/^([^:]+):/, `${normalizedNames[name]}:`);
      }
    }
    return line;
  });
}

/**
 * Split a line at the cursor position into two lines
 * This is a placeholder for future implementation
 */
function splitAtCursor() {
  const t = translations[currentLang];
  const scriptEditor = document.getElementById('scriptEditor');
  
  if (!scriptEditor) {
    showToast(t.errorEditorNotFound || 'Editor not found', 3000, 'error');
    return;
  }
  
  const cursorPos = scriptEditor.selectionStart;
  const text = scriptEditor.value;
  
  // Find the current line
  const lines = text.split('\n');
  let lineStart = 0;
  let lineEnd = 0;
  let currentLineIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    lineEnd = lineStart + lines[i].length;
    
    if (cursorPos >= lineStart && cursorPos <= lineEnd) {
      currentLineIndex = i;
      break;
    }
    
    lineStart = lineEnd + 1; // +1 for the newline character
  }
  
  const currentLine = lines[currentLineIndex];
  const charMatch = currentLine.match(/^([^:]+):/);
  
  if (!charMatch) {
    showToast(t.errorNoCharacterLine || 'Can only split character dialogue lines', 3000, 'warning');
    return;
  }
  
  const character = charMatch[1].trim();
  const relativePos = cursorPos - lineStart;
  
  // If cursor is before the character name, can't split
  if (relativePos <= character.length + 1) {
    showToast(t.errorSplitPosition || 'Position cursor within the dialogue text to split', 3000, 'warning');
    return;
  }
  
  // Split at cursor position
  const firstPart = currentLine.substring(0, relativePos);
  const secondPart = `${character}: ${currentLine.substring(relativePos)}`;
  
  // Update lines array
  lines[currentLineIndex] = firstPart;
  lines.splice(currentLineIndex + 1, 0, secondPart);
  
  // Update editor content
  scriptEditor.value = lines.join('\n');
  
  // Update parsing
  updateScriptParsing();
  
  showToast(t.splitSuccess || 'Line split successfully', 2000, 'success');
}
