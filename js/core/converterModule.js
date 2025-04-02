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
        focusEditorOnLine(document.getElementById('scriptEditor'), lineIndex, cleanedScriptLines);
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
 * @param {Array} cleanedLines - Array of preprocessed script lines
 */
function focusEditorOnLine(editor, lineIndex, cleanedLines) {
  if (!editor || lineIndex === undefined || !cleanedLines || lineIndex < 0 || lineIndex >= cleanedLines.length) {
    return;
  }

  const lineToFind = cleanedLines[lineIndex];
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
    editor.classList.add('line-highlight');
    
    // Remove the highlight after a short delay
    setTimeout(() => {
      editor.classList.remove('line-highlight');
    }, 1000);
  } else {
    // If exact match not found, try fuzzy matching
    const simplifiedLine = lineToFind.trim().replace(/\s+/g, ' ');
    const lineWords = simplifiedLine.split(' ');
    
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
    
    // Show the role selection step instead of going directly to metadata editing
    showRoleSelectionStep();
    
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
 * Display the role selection step which allows users to review and select characters
 */
function showRoleSelectionStep() {
  // Create a dedicated container for the role selection step if it doesn't exist
  let roleSelectionContainer = document.getElementById('role-selection-container');
  if (!roleSelectionContainer) {
    const step2Container = document.getElementById('step2-container');
    if (!step2Container) return;

    roleSelectionContainer = document.createElement('div');
    roleSelectionContainer.id = 'role-selection-container';
    roleSelectionContainer.className = 'role-selection-container card-style';
    
    // Insert after step2-container
    step2Container.parentNode.insertBefore(roleSelectionContainer, step2Container.nextSibling);
  }
  
  // Reset the container
  roleSelectionContainer.innerHTML = '';
  
  const t = translations[currentLang];
  
  // Create the header section
  const header = document.createElement('div');
  header.className = 'role-selection-header';
  header.innerHTML = `
    <h3><i class="fas fa-user-check"></i> ${t.selectRolesTitle || 'Select Character Roles'}</h3>
    <p class="help-text">${t.selectRolesHelp || 'Review and select characters that should be included in your script.'}</p>
  `;
  roleSelectionContainer.appendChild(header);
  
  // Extract characters from cleaned script
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
  
  // Create the character selection list
  const characterList = document.createElement('div');
  characterList.className = 'role-selection-list';
  
  // If no characters were detected
  if (Object.keys(characters).length === 0) {
    characterList.innerHTML = `
      <div class="no-characters-detected">
        <i class="fas fa-exclamation-circle"></i>
        <p>${t.noCharactersDetected || 'No characters detected. Try adding character names followed by a colon.'}</p>
      </div>
    `;
    roleSelectionContainer.appendChild(characterList);
    return;
  }
  
  // Header for the character list
  const listHeader = document.createElement('div');
  listHeader.className = 'role-list-header';
  listHeader.innerHTML = `
    <div class="role-select-all">
      <label>
        <input type="checkbox" id="select-all-roles" checked>
        <span>${t.selectAll || 'Select All'}</span>
      </label>
    </div>
    <div class="role-count">
      ${Object.keys(characters).length} ${Object.keys(characters).length === 1 ? 
        (t.characterSingular || 'character') : 
        (t.characterPlural || 'characters')} ${t.detected || 'detected'}
    </div>
  `;
  characterList.appendChild(listHeader);
  
  // Add role selection items
  const roleItemsContainer = document.createElement('div');
  roleItemsContainer.className = 'role-items-container';
  
  // Sort characters by frequency (most lines first)
  Object.entries(characters)
    .sort((a, b) => b[1] - a[1])
    .forEach(([character, count]) => {
      const hash = Array.from(character).reduce((acc, char) => char.charCodeAt(0) + acc, 0);
      const hue = hash % 360;
      const color = `hsl(${hue}, 70%, 60%)`;
      
      const characterItem = document.createElement('div');
      characterItem.className = 'role-selection-item';
      characterItem.innerHTML = `
        <label class="role-checkbox">
          <input type="checkbox" class="role-item-checkbox" data-character="${character}" checked>
          <span class="checkmark"></span>
        </label>
        <div class="role-item-content">
          <div class="role-color" style="background-color: ${color}"></div>
          <div class="role-details">
            <span class="role-name">${character}</span>
            <span class="role-line-count">${count} ${count === 1 ? 
              (t.lineSingular || 'line') : 
              (t.linePlural || 'lines')}</span>
          </div>
        </div>
        <div class="role-actions">
          <button class="role-rename-btn" data-character="${character}" title="${t.renameCharacter || 'Rename character'}">
            <i class="fas fa-pencil-alt"></i>
          </button>
          <button class="role-merge-btn" data-character="${character}" title="${t.mergeCharacter || 'Merge with another character'}">
            <i class="fas fa-object-group"></i>
          </button>
        </div>
      `;
      
      roleItemsContainer.appendChild(characterItem);
    });
  
  characterList.appendChild(roleItemsContainer);
  
  // Add buttons for navigation
  const actionButtons = document.createElement('div');
  actionButtons.className = 'role-selection-actions';
  actionButtons.innerHTML = `
    <button id="role-selection-back" class="secondary-button">
      <i class="fas fa-arrow-left"></i> ${t.backToEditing || 'Back to Editing'}
    </button>
    <button id="role-selection-continue" class="primary-button">
      ${t.continueToMetadata || 'Continue to Metadata'} <i class="fas fa-arrow-right"></i>
    </button>
  `;
  
  roleSelectionContainer.appendChild(characterList);
  roleSelectionContainer.appendChild(actionButtons);
  
  // Add event listeners
  document.getElementById('select-all-roles').addEventListener('change', function() {
    const isChecked = this.checked;
    document.querySelectorAll('.role-item-checkbox').forEach(checkbox => {
      checkbox.checked = isChecked;
    });
  });
  
  document.querySelectorAll('.role-rename-btn').forEach(button => {
    button.addEventListener('click', function() {
      const character = this.dataset.character;
      renameCharacterInScript(character);
    });
  });
  
  document.querySelectorAll('.role-merge-btn').forEach(button => {
    button.addEventListener('click', function() {
      const character = this.dataset.character;
      mergeCharacterWithAnother(character);
    });
  });
  
  document.getElementById('role-selection-back').addEventListener('click', function() {
    // Hide role selection and go back to step 2
    roleSelectionContainer.style.display = 'none';
    document.getElementById('step2-container').style.display = 'block';
  });
  
  document.getElementById('role-selection-continue').addEventListener('click', function() {
    // Process selected roles and continue to step 3
    processSelectedRoles();
    roleSelectionContainer.style.display = 'none';
    showStep(3);
  });
  
  // Show this container, hide others
  document.querySelectorAll('.step-container').forEach(container => {
    container.style.display = 'none';
  });
  roleSelectionContainer.style.display = 'block';
}

/**
 * Process the selected roles and prepare them for the metadata step
 */
function processSelectedRoles() {
  // Get all selected characters
  const selectedCharacters = [];
  document.querySelectorAll('.role-item-checkbox:checked').forEach(checkbox => {
    selectedCharacters.push(checkbox.dataset.character);
  });
  
  // Filter cleaned script lines to include only the selected characters' lines and stage directions
  const filteredLines = cleanedScriptLines.filter(line => {
    // Keep stage directions
    if (line.startsWith('(') && line.endsWith(')')) return true;
    
    // Keep scene markers
    if (line.match(/^(ACT|SCENE|ATTO|SCENA)\s+/i)) return true;
    
    // Keep only dialogue from selected characters
    const charMatch = line.match(/^([^:]+):/);
    if (charMatch) {
      const character = charMatch[1].trim();
      return selectedCharacters.includes(character);
    }
    
    // Keep lines without character references
    return !line.includes(':');
  });
  
  // Update the cleaned script lines with the filtered ones
  cleanedScriptLines = filteredLines;
  
  // Create character objects for the metadata step
  const characterObjects = selectedCharacters.map(name => ({
    primaryName: name,
    aliases: [name],
    description: '',
    lineCount: countCharacterLines(name)
  }));
  
  // Update the roles container with the selected characters
  const rolesContainer = document.getElementById('rolesContainer');
  if (rolesContainer) {
    // Clear existing roles
    rolesContainer.innerHTML = '';
    
    // Add role fields for each selected character
    characterObjects.forEach(character => {
      addNewRoleField(character);
    });
  }
}

/**
 * Count the number of lines for a character in the cleaned script
 * @param {string} character - Character name
 * @returns {number} - Number of lines
 */
function countCharacterLines(character) {
  return cleanedScriptLines.filter(line => {
    const match = line.match(/^([^:]+):/);
    return match && match[1].trim() === character;
  }).length;
}

/**
 * Rename a character throughout the script
 * @param {string} oldName - Current character name
 */
function renameCharacterInScript(oldName) {
  const t = translations[currentLang];
  const newName = prompt(t.editCharacterPrompt || 'Edit character name:', oldName);
  
  if (!newName || newName === oldName) return;
  
  // Replace in cleanedScriptLines
  cleanedScriptLines = cleanedScriptLines.map(line => {
    if (line.startsWith(`${oldName}:`)) {
      return line.replace(/^([^:]+):/, `${newName}:`);
    }
    return line;
  });
  
  // Update the checkbox data attribute and displayed name
  const checkbox = document.querySelector(`.role-item-checkbox[data-character="${oldName}"]`);
  if (checkbox) {
    checkbox.dataset.character = newName;
    const nameElement = checkbox.closest('.role-selection-item').querySelector('.role-name');
    if (nameElement) {
      nameElement.textContent = newName;
    }
    
    // Update button data attributes
    const renameBtn = checkbox.closest('.role-selection-item').querySelector('.role-rename-btn');
    if (renameBtn) {
      renameBtn.dataset.character = newName;
    }
    
    const mergeBtn = checkbox.closest('.role-selection-item').querySelector('.role-merge-btn');
    if (mergeBtn) {
      mergeBtn.dataset.character = newName;
    }
  }
  
  showToast(t.characterRenamed || 'Character renamed successfully', 2000, 'success');
}

/**
 * Merge one character with another
 * @param {string} sourceCharacter - The character to merge from
 */
function mergeCharacterWithAnother(sourceCharacter) {
  const t = translations[currentLang];
  
  // Get list of other characters
  const otherCharacters = [];
  document.querySelectorAll('.role-item-checkbox').forEach(checkbox => {
    const character = checkbox.dataset.character;
    if (character !== sourceCharacter) {
      otherCharacters.push(character);
    }
  });
  
  if (otherCharacters.length === 0) {
    showToast(t.errorNoOtherCharacters || 'No other characters to merge with', 3000, 'warning');
    return;
  }
  
  // Create options for the prompt
  const options = otherCharacters.map(char => `${char}`).join('\n');
  const targetCharacter = prompt(
    `${t.selectTargetCharacter || 'Select target character to merge with'} "${sourceCharacter}":\n\n${options}`, 
    otherCharacters[0]
  );
  
  if (!targetCharacter || !otherCharacters.includes(targetCharacter)) {
    return;
  }
  
  // Replace source character with target character in the script
  cleanedScriptLines = cleanedScriptLines.map(line => {
    if (line.startsWith(`${sourceCharacter}:`)) {
      return line.replace(/^([^:]+):/, `${targetCharacter}:`);
    }
    return line;
  });
  
  // Remove the source character's checkbox item
  const sourceItem = document.querySelector(`.role-item-checkbox[data-character="${sourceCharacter}"]`).closest('.role-selection-item');
  if (sourceItem) {
    sourceItem.remove();
  }
  
  // Update the target character's line count
  const targetLineCount = countCharacterLines(targetCharacter);
  const targetLineCountElement = document.querySelector(`.role-item-checkbox[data-character="${targetCharacter}"]`).closest('.role-selection-item').querySelector('.role-line-count');
  if (targetLineCountElement) {
    targetLineCountElement.textContent = `${targetLineCount} ${targetLineCount === 1 ? 
      (t.lineSingular || 'line') : 
      (t.linePlural || 'lines')}`;
  }
  
  showToast(
    `${t.charactersMerged || 'Characters merged successfully'}: ${sourceCharacter} → ${targetCharacter}`,
    2000,
    'success'
  );
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

/**
 * Copy the processed script to clipboard
 */
function copyScriptToClipboard() {
  const t = translations[currentLang];
  
  if (!parseResult || !parseResult.processedLines) {
    showToast(t.errorNoScriptData || 'No script data available to copy', 3000, 'error');
    return;
  }
  
  try {
    const textToCopy = cleanedScriptLines.join('\n');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast(t.copiedToClipboard || 'Script copied to clipboard!', 2000, 'success');
    }).catch(err => {
      console.error('Could not copy text:', err);
      showToast(t.errorCopyingToClipboard || 'Failed to copy to clipboard', 3000, 'error');
    });
  } catch (error) {
    console.error('Error copying script to clipboard:', error);
    showToast(t.errorCopyingToClipboard || 'Failed to copy to clipboard', 3000, 'error');
  }
}

/**
 * Download the processed script as a text file
 */
function downloadScript() {
  const t = translations[currentLang];
  
  if (!parseResult || !parseResult.processedLines) {
    showToast(t.errorNoScriptData || 'No script data available to download', 3000, 'error');
    return;
  }
  
  try {
    const textToDownload = cleanedScriptLines.join('\n');
    const blob = new Blob([textToDownload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger the download
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    
    // Generate a filename based on metadata if available, or use a default name
    const metadata = document.getElementById('scriptTitle') ? 
                     document.getElementById('scriptTitle').value : 'script';
    const filename = `${metadata.trim() || 'script'}.txt`;
    
    downloadLink.download = filename;
    
    // Append to body, click to download, then remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Release the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    showToast(t.downloadSuccess || 'Script downloaded successfully!', 2000, 'success');
  } catch (error) {
    console.error('Error downloading script:', error);
    showToast(t.errorDownloading || 'Failed to download script', 3000, 'error');
  }
}

/**
 * Add a new role field to the roles editor
 * @param {Object} [roleData] - Optional initial role data
 */
function addNewRoleField(roleData = {}) {
  const rolesContainer = document.getElementById('rolesContainer');
  if (!rolesContainer) return;
  
  const t = translations[currentLang];
  const roleId = 'role-' + Date.now(); // Unique ID for the new role
  
  // Create a new role field element
  const roleField = document.createElement('div');
  roleField.className = 'role-field';
  roleField.id = roleId;
  
  // Create the HTML structure for the role field
  roleField.innerHTML = `
    <div class="role-header">
      <span class="role-name">${t.roleName || 'Character Name'}</span>
      <button type="button" class="remove-role" title="${t.removeRole || 'Remove this character'}">×</button>
    </div>
    <div class="role-details">
      <div class="input-group">
        <input type="text" class="role-primary-name" placeholder="${t.roleName || 'Character Name'}" value="${roleData.primaryName || ''}">
      </div>
      <div class="input-group">
        <input type="text" class="role-aliases" placeholder="${t.roleAliasesPlaceholder || 'E.g. BOB, Robert (comma-separated)'}" 
               value="${roleData.aliases ? roleData.aliases.filter(a => a !== roleData.primaryName).join(', ') : ''}">
      </div>
      <div class="input-group full-width">
        <textarea class="role-description" placeholder="${t.roleDescriptionPlaceholder || 'Brief character description'}">${roleData.description || ''}</textarea>
      </div>
    </div>
  `;
  
  // Add the new role field to the container
  rolesContainer.appendChild(roleField);
  
  // Add event listener to the remove button
  const removeButton = roleField.querySelector('.remove-role');
  if (removeButton) {
    removeButton.addEventListener('click', () => {
      // Add a fade out animation before removing the element
      roleField.classList.add('fade-out');
      setTimeout(() => {
        rolesContainer.removeChild(roleField);
      }, 300); // Match this timing with the CSS transition
    });
  }
  
  // Focus on the name field for easy editing
  setTimeout(() => {
    const nameField = roleField.querySelector('.role-primary-name');
    if (nameField) {
      nameField.focus();
    }
  }, 100);
}

/**
 * Prepare role fields from detected characters
 */
function prepareRolesFromDetectedCharacters() {
  const rolesContainer = document.getElementById('rolesContainer');
  if (!rolesContainer) return;
  
  // Clear existing roles
  rolesContainer.innerHTML = '';
  
  // Extract characters from cleaned script
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
  
  // Sort characters by frequency (most lines first)
  const sortedCharacters = Object.entries(characters)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      primaryName: name,
      aliases: [name],
      description: '',
      lineCount: count
    }));
  
  // Add role fields for each character
  sortedCharacters.forEach(character => {
    addNewRoleField(character);
  });
}

/**
 * Set up event handlers and functionality for the simplified converter view
 */
export function setupSimpleConverterHandlers() {
  const scriptEditor = document.getElementById('scriptEditor');
  const parsingPreview = document.getElementById('parsingPreview');
  const backButton = document.getElementById('simpleConverterBackButton');
  const copyButton = document.getElementById('copyScriptButton');
  const downloadButton = document.getElementById('downloadScriptButton');
  const t = translations[currentLang].converter || {};
  let cleanedScriptLines = [];

  // Initialize with sample text if available
  const initialText = localStorage.getItem('simple_converter_backup') || 
    `HAMLET: To be, or not to be: that is the question.

OPHELIA: My lord, I have remembrances of yours,
That I have longed long to re-deliver;
I pray you, now receive them.

(Hamlet looks at her with suspicion)

HAMLET: No, not I; I never gave you aught.

OPHELIA: My honored lord, you know right well you did.`;

  if (scriptEditor) {
    scriptEditor.value = initialText;
    scriptEditor.addEventListener('input', debounceSimpleScriptParsing);
    scriptEditor.addEventListener('keydown', handleEditorKeydown);
    
    // Initial parsing
    updateSimpleScriptParsing();
  }

  // Set up toolbar buttons
  document.querySelectorAll('.tool-button').forEach(button => {
    button.addEventListener('click', () => handleToolAction(button.dataset.action));
  });

  // Back button handler
  if (backButton) {
    backButton.addEventListener('click', () => {
      if (scriptEditor.value.trim() !== initialText.trim() &&
          !confirm(t.confirmLeave || 'Leave converter? Your changes will be lost.')) {
        return;
      }
      leaveConverterView();
    });
  }

  // Copy button handler
  if (copyButton) {
    copyButton.addEventListener('click', () => {
      if (!scriptEditor || !scriptEditor.value.trim()) {
        showToast(t.errorNoScriptData || 'No script text to copy', 3000, 'error');
        return;
      }

      navigator.clipboard.writeText(scriptEditor.value)
        .then(() => {
          showToast(t.copiedToClipboard || 'Script copied to clipboard!', 2000, 'success');
        })
        .catch(err => {
          console.error('Could not copy text:', err);
          showToast(t.errorCopyingToClipboard || 'Failed to copy to clipboard', 3000, 'error');
        });
    });
  }

  // Download button handler
  if (downloadButton) {
    downloadButton.addEventListener('click', () => {
      if (!scriptEditor || !scriptEditor.value.trim()) {
        showToast(t.errorNoScriptData || 'No script text to download', 3000, 'error');
        return;
      }

      try {
        const textToDownload = scriptEditor.value;
        const blob = new Blob([textToDownload], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Create a temporary link element to trigger the download
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        
        // Generate a filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `script-${timestamp}.txt`;
        
        downloadLink.download = filename;
        
        // Append to body, click to download, then remove
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Release the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        showToast(t.downloadSuccess || 'Script downloaded successfully!', 2000, 'success');
      } catch (error) {
        console.error('Error downloading script:', error);
        showToast(t.errorDownloading || 'Failed to download script', 3000, 'error');
      }
    });
  }

  /**
   * Debounce the script parsing to avoid excessive updates
   */
  function debounceSimpleScriptParsing() {
    if (this.parseTimeout) {
      clearTimeout(this.parseTimeout);
    }
    
    this.parseTimeout = setTimeout(() => {
      updateSimpleScriptParsing();
    }, 300); // 300ms delay before executing the actual parsing
  }

  /**
   * Update the script parsing for the simple converter view
   */
  function updateSimpleScriptParsing() {
    if (!scriptEditor) return;
    
    const rawText = scriptEditor.value;
    
    try {
      // Save to localStorage
      localStorage.setItem('simple_converter_backup', rawText);
      
      // Process the script with aggressive character detection
      cleanedScriptLines = ScriptProcessor.preProcessScript(rawText, { aggressiveDetection: true });
      
      // Update UI components
      renderSimpleParsingPreview();
      updateSimpleDetectedCharactersList();
      updateSimpleScriptStats();
    } catch (error) {
      console.error('Error parsing script:', error);
      showToast(t.errorParse || 'Error parsing script', 3000, 'error');
    }
  }

  /**
   * Render the parsing preview with highlighted characters
   */
  function renderSimpleParsingPreview() {
    if (!parsingPreview) return;
    
    parsingPreview.innerHTML = '';
    
    const characterColors = {};
    
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
      
      // Add click event to focus editor on that line
      lineElement.addEventListener('click', () => {
        focusEditorOnLine(scriptEditor, index, cleanedScriptLines);
      });
      
      // If we're in a scene, add to scene container
      const container = sceneContainer || parsingPreview;
      
      // Process character lines
      const charMatch = line.match(/^([^:]+):\s*(.+)$/);
      if (charMatch) {
        const character = charMatch[1].trim();
        const dialogue = charMatch[2].trim();
        
        // Generate a consistent color for each character
        if (!characterColors[character]) {
          const hash = Array.from(character).reduce((acc, char) => char.charCodeAt(0) + acc, 0);
          const hue = hash % 360;
          characterColors[character] = `hsl(${hue}, 70%, 60%)`;
        }
        
        lineElement.innerHTML = `
          <span class="character-name" style="color: ${characterColors[character]}">${character}:</span>
          <span class="dialogue-text">${dialogue}</span>
        `;
        lineElement.dataset.character = character;
      } else if (line.startsWith('(') && line.endsWith(')')) {
        // Stage direction
        lineElement.innerHTML = `<span class="stage-direction">${line}</span>`;
        lineElement.classList.add('direction-line');
      } else {
        lineElement.innerHTML = `<span class="plain-text">${line}</span>`;
      }
      
      container.appendChild(lineElement);
    });
  }

  /**
   * Update the list of detected characters in the script
   */
  function updateSimpleDetectedCharactersList() {
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
    
    // Add a summary header
    const summary = document.createElement('div');
    summary.className = 'characters-summary';
    summary.innerHTML = `
      <div class="character-count">
        <span class="count-number">${characterCount}</span>
        <span class="count-label">${characterCount === 1 ? 
          (t.characterSingular || 'Character') : 
          (t.characterPlural || 'Characters')}</span>
      </div>
    `;
    detectedCharactersList.appendChild(summary);
    
    if (characterCount === 0) {
      const noChars = document.createElement('div');
      noChars.className = 'no-characters-detected';
      noChars.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>${t.noCharactersDetected || 'No characters detected. Try adding character names followed by a colon.'}</p>
      `;
      detectedCharactersList.appendChild(noChars);
      return;
    }
    
    // Create character list
    const characterList = document.createElement('div');
    characterList.className = 'character-items';
    
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
          <span class="character-name">${character}</span>
          <span class="line-count">${count} ${count === 1 ? 
            (t.lineSingular || 'line') : 
            (t.linePlural || 'lines')}</span>
          <button class="character-edit" title="${t.editCharacter || 'Edit character'}">
            <i class="fas fa-pencil-alt"></i>
          </button>
        `;
        
        // Add edit character functionality
        const editButton = characterItem.querySelector('.character-edit');
        if (editButton) {
          editButton.addEventListener('click', () => {
            promptEditCharacter(character, scriptEditor, updateSimpleScriptParsing);
          });
        }
        
        characterList.appendChild(characterItem);
      });
    
    detectedCharactersList.appendChild(characterList);
  }

  /**
   * Update script statistics
   */
  function updateSimpleScriptStats() {
    const statsElement = document.getElementById('scriptStats');
    if (!scriptEditor || !statsElement) return;
    
    const text = scriptEditor.value;
    const characters = text.length;
    const words = text.split(/\s+/).filter(Boolean).length;
    const lines = text.split('\n').filter(Boolean).length;
    
    statsElement.innerHTML = `
      <i class="fas fa-align-left"></i> ${lines} ${t.statsLines || 'lines'} &nbsp;
      <i class="fas fa-font"></i> ${words} ${t.statsWords || 'words'} &nbsp;
      <i class="fas fa-keyboard"></i> ${characters} ${t.statsChars || 'chars'}
    `;
  }

  /**
   * Handle toolbar button actions for the simple converter
   */
  function handleToolAction(action) {
    if (!scriptEditor) return;
    
    const start = scriptEditor.selectionStart;
    const end = scriptEditor.selectionEnd;
    const selectedText = scriptEditor.value.substring(start, end);
    
    switch(action) {
      case 'uppercase':
        if (selectedText) {
          const newText = selectedText.toUpperCase();
          scriptEditor.value = scriptEditor.value.substring(0, start) + newText + scriptEditor.value.substring(end);
          scriptEditor.selectionStart = start;
          scriptEditor.selectionEnd = start + newText.length;
          updateSimpleScriptParsing();
        }
        break;
      case 'add-character':
        const characterName = prompt(t.enterCharacterName || 'Enter character name:');
        if (characterName) {
          const formattedText = `${characterName.trim()}: `;
          insertTextAtCursor(scriptEditor, formattedText);
          updateSimpleScriptParsing();
        }
        break;
      case 'clear':
        if (confirm(t.confirmClear || 'Clear all text? This cannot be undone.')) {
          scriptEditor.value = '';
          updateSimpleScriptParsing();
        }
        break;
    }
    
    scriptEditor.focus();
  }

  /**
   * Show a dialog to edit a character name and update all instances
   * @param {string} oldName - Original character name
   * @param {HTMLElement} editor - Editor element
   * @param {Function} updateCallback - Function to call after editing
   */
  function promptEditCharacter(oldName, editor, updateCallback) {
    const newName = prompt(t.editCharacterPrompt || 'Edit character name:', oldName);
    
    if (!newName || newName === oldName) return;
    
    if (!editor) return;
    
    // Replace all occurrences of the character name in the script
    const regex = new RegExp(`^${oldName}:`, 'gm');
    editor.value = editor.value.replace(regex, `${newName}:`);
    
    if (updateCallback && typeof updateCallback === 'function') {
      updateCallback();
    }
    
    showToast(t.characterRenamed || 'Character renamed successfully', 2000, 'success');
  }
}
