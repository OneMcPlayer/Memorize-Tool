import { translations } from '/Memorize-Tool/js/translations.js';
import { showToast } from '/Memorize-Tool/js/utils.js';
import { ScriptConverter } from '/Memorize-Tool/js/services/ScriptConverter.js';
import { ScriptProcessor } from '/Memorize-Tool/js/services/ScriptProcessor.js';
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
    return;
  }
  
  // Store the processed lines for the preview pane
  cleanedScriptLines = [...parseResult.processedLines];
  
  // Use the original text for the editor if provided
  setupInteractiveEditor(originalText || cleanedScriptLines.join('\n'));
  updateDetectedCharactersList();
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
        <button type="button" class="tool-button" title="${t.toolBold || 'Bold'}" data-action="bold"><i class="fas fa-bold"></i></button>
        <button type="button" class="tool-button" title="${t.toolItalic || 'Italic'}" data-action="italic"><i class="fas fa-italic"></i></button>
        <button type="button" class="tool-button" title="${t.toolUppercase || 'UPPERCASE'}" data-action="uppercase"><i class="fas fa-font"></i></button>
        <span class="editor-divider"></span>
        <button type="button" class="tool-button" title="${t.toolAddCharacter || 'Add Character Name'}" data-action="add-character"><i class="fas fa-user-plus"></i></button>
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
  } catch (error) {
    console.error('Error parsing script:', error);
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
          <button class="line-action-button" title="${translations[currentLang].editLine || 'Edit this line'}">
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
          <button class="line-action-button" title="${translations[currentLang].editDirection || 'Edit direction'}">
            <i class="fas fa-pencil-alt"></i>
          </button>
        </div>
      `;
      lineElement.classList.add('direction-line');
    } else {
      lineElement.innerHTML = `
        <span class="plain-text">${line}</span>
        <div class="line-actions">
          <button class="line-action-button" title="${translations[currentLang].editLine || 'Edit this line'}">
            <i class="fas fa-pencil-alt"></i>
          </button>
        </div>
      `;
    }
    
    container.appendChild(lineElement);
  });
  
  // Add event listeners for line action buttons
  document.querySelectorAll('.line-action-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();  // Prevent triggering the parent click event
      const lineElement = button.closest('.script-line');
      if (lineElement) {
        const lineIndex = parseInt(lineElement.dataset.index);
        focusEditorOnLine(document.getElementById('scriptEditor'), lineIndex);
      }
    });
  });
}

/**
 * Finalize the cleaned script before moving to metadata editing
 */
function finalizeCleanedScript() {
  const scriptEditor = document.getElementById('scriptEditor');
  const t = translations[currentLang];
  
  if (scriptEditor) {
    try {
      const rawText = scriptEditor.value;
      // Process the raw editor text for the final step
      cleanedScriptLines = ScriptProcessor.preProcessScript(rawText, { aggressiveDetection: true });
      showStep(3);
      prepareRolesFromDetectedCharacters();
      showToast(t.cleanSuccess || 'Script cleaned successfully', 2000, 'success');
    } catch (error) {
      console.error('Error finalizing script:', error);
      showToast(t.errorClean || 'Error processing cleaned script', 3000, 'error');
    }
  } else {
    showStep(3);
  }
}

/**
 * Prepare roles fields based on detected characters
 */
function prepareRolesFromDetectedCharacters() {
  const characters = new Set();
  cleanedScriptLines.forEach(line => {
    const match = line.match(/^([^:]+):/);
    if (match) characters.add(match[1].trim());
  });
  
  const rolesContainer = document.getElementById('scriptRolesContainer');
  if (!rolesContainer) return;
  rolesContainer.innerHTML = '';
  
  characters.forEach(character => {
    addRoleField({
      primaryName: character,
      aliases: [character],
      description: ''
    });
  });
}

/**
 * Add a new role field to the converter form
 * @param {Object} roleData - Optional role data to populate the field
 */
function addRoleField(roleData = {}) {
  const t = translations[currentLang];
  const rolesContainer = document.getElementById('rolesContainer');
  const roleId = createValidId(`role-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
  
  const roleHtml = `
    <div class="role-field" id="${roleId}">
      <div class="role-header">
        <input type="text" class="role-name" value="${roleData.primaryName || ''}" 
               placeholder="${t.roleName || 'Character Name'}" required>
        <button type="button" class="remove-role" title="${t.removeRole || 'Remove'}" aria-label="${t.removeRole || 'Remove'}">×</button>
      </div>
      <div class="role-details">
        <div class="form-group">
          <label>${t.roleAliases || 'Aliases'}</label>
          <input type="text" class="role-aliases" value="${(roleData.aliases || []).join(', ')}" 
                 placeholder="${t.roleAliasesPlaceholder || 'E.g. JOHN, Johnny (comma-separated)'}">
        </div>
        <div class="form-group">
          <label>${t.roleDescription || 'Description'}</label>
          <input type="text" class="role-description" value="${roleData.description || ''}" 
                 placeholder="${t.roleDescriptionPlaceholder || 'Brief character description'}">
        </div>
      </div>
    </div>
  `;
  
  rolesContainer.insertAdjacentHTML('beforeend', roleHtml);
  
  const removeButton = rolesContainer.querySelector(`#${roleId} .remove-role`);
  if (removeButton) {
    removeButton.addEventListener('click', () => {
      const roleElement = document.getElementById(roleId);
      roleElement.classList.add('fade-out');
      setTimeout(() => {
        roleElement.remove();
        if (rolesContainer.querySelectorAll('.role-field').length === 0) {
          addRoleField();
        }
      }, 300);
    });
  }
  
  const nameField = rolesContainer.querySelector(`#${roleId} .role-name`);
  if (nameField && !nameField.value) {
    nameField.focus();
  }
}

/**
 * Add a new empty role field
 */
function addNewRoleField() {
  addRoleField();
  
  const rolesContainer = document.getElementById('rolesContainer');
  const lastRole = rolesContainer.lastElementChild;
  
  if (lastRole) {
    lastRole.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}

/**
 * Export the structured script
 */
function exportScript() {
  const t = translations[currentLang];
  
  try {
    const metadata = {
      title: document.getElementById('scriptTitle').value,
      author: document.getElementById('scriptAuthor').value,
      date: document.getElementById('scriptDate').value,
      description: document.getElementById('scriptDescription').value
    };
    
    if (!metadata.title.trim()) {
      document.getElementById('scriptTitle').classList.add('field-error');
      showToast(t.errorNoTitle || 'Please enter a script title', 3000, 'error');
      setTimeout(() => document.getElementById('scriptTitle').classList.remove('field-error'), 2000);
      return;
    }
    
    const roles = [];
    let hasValidRoles = false;
    
    document.querySelectorAll('.role-field').forEach(field => {
      const nameInput = field.querySelector('.role-name');
      if (nameInput && nameInput.value.trim()) {
        hasValidRoles = true;
        roles.push({
          primaryName: nameInput.value.trim(),
          aliases: field.querySelector('.role-aliases').value
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
          description: field.querySelector('.role-description').value.trim()
        });
      } else if (nameInput) {
        nameInput.classList.add('field-error');
        setTimeout(() => nameInput.classList.remove('field-error'), 2000);
      }
    });
    
    if (!hasValidRoles) {
      showToast(t.errorNoRoles || 'Please add at least one character with a name', 3000, 'error');
      return;
    }
    
    const inputText = document.getElementById('converterInput').value;
    const structuredScript = ScriptConverter.generateStructuredScript(inputText, metadata, roles);
    
    document.getElementById('converterOutput').value = structuredScript;
    showToast(t.successExport, 2000, 'success');
    showStep(3);
    
  } catch (error) {
    console.error('Error exporting script:', error);
    showToast(t.errorExport || 'Error exporting script', 3000, 'error');
  }
}

/**
 * Copy the script to clipboard
 */
async function copyScriptToClipboard() {
  const t = translations[currentLang];
  const outputText = document.getElementById('converterOutput').value;
  
  if (!outputText.trim()) {
    showToast(t.errorNoOutput || 'No output to copy', 3000, 'error');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(outputText);
    showToast(t.successCopy || 'Copied to clipboard!', 2000, 'success');
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    showToast(t.errorCopy || 'Failed to copy to clipboard', 3000, 'error');
  }
}

/**
 * Download the structured script as a file
 */
function downloadScript() {
  const t = translations[currentLang];
  const outputText = document.getElementById('converterOutput').value;
  
  if (!outputText.trim()) {
    showToast(t.errorNoOutput || 'No output to download', 3000, 'error');
    return;
  }
  
  const title = document.getElementById('scriptTitle').value.trim() || 'script';
  const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  
  const blob = new Blob([outputText], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = `${safeTitle}.script`;
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  
  showToast(t.successDownload || 'Script downloaded!', 2000, 'success');
}

/**
 * Auto-detect characters in the script more aggressively
 */
function autoDetectCharacters() {
  const t = translations[currentLang];
  
  try {
    const inputText = cleanedScriptLines.join('\n');
    const processedLines = ScriptProcessor.preProcessScript(inputText, { aggressiveDetection: true });
    
    if (confirm(t.confirmAutoDetect || 'Replace current script with auto-detected character lines?')) {
      cleanedScriptLines = processedLines;
      renderScriptPreview();
      updateDetectedCharactersList();
      showToast(t.autoDetectSuccess || 'Character detection improved', 2000, 'success');
    }
  } catch (error) {
    console.error('Error in auto-detection:', error);
    showToast(t.errorAutoDetect || 'Error in character detection', 3000, 'error');
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
  
  let targetCharacter = null;
  const firstLine = cleanedScriptLines[indices[0]];
  const charMatch = firstLine.match(/^([^:]+):/);
  if (charMatch) {
    targetCharacter = charMatch[1].trim();
  } else {
    const characterOptions = new Set();
    indices.forEach(idx => {
      const match = cleanedScriptLines[idx].match(/^([^:]+):/);
      if (match) characterOptions.add(match[1].trim());
    });
    
    if (characterOptions.size > 0) {
      targetCharacter = Array.from(characterOptions)[0];
    } else {
      targetCharacter = prompt(t.enterCharacterName || 'Enter character name for merged lines:');
      if (!targetCharacter) return;
    }
  }
  
  let mergedDialogue = '';
  indices.forEach(idx => {
    const line = cleanedScriptLines[idx];
    const dialogueMatch = line.match(/^([^:]+):\s*(.+)$/);
    
    if (dialogueMatch) {
      mergedDialogue += ' ' + dialogueMatch[2].trim();
    } else {
      mergedDialogue += ' ' + line.trim();
    }
  });
  
  mergedDialogue = mergedDialogue.trim();
  
  const mergedLine = `${targetCharacter}: ${mergedDialogue}`;
  
  cleanedScriptLines[indices[0]] = mergedLine;
  
  for (let i = indices.length - 1; i > 0; i--) {
    cleanedScriptLines.splice(indices[i], 1);
  }
  
  renderScriptPreview();
  updateDetectedCharactersList();
  
  showToast(t.mergeSuccess || 'Lines merged successfully', 2000, 'success');
}

/**
 * Split a line at the cursor position into two lines
 */
function splitAtCursor() {
  const t = translations[currentLang];
  alert(t.splitFeatureNotAvailable || 'Line splitting functionality will be implemented in a future update. For now, please edit your script manually before pasting.');
}
