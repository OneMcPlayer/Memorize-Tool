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
  
  setupScriptPreviewEvents();
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
    <div class="editor-preview-container">
      <div class="editor-container">
        <h4>${t.editScriptTitle || 'Edit Script'}</h4>
        <p class="help-text">${t.editScriptHelp || 'Edit the script and see parsing updates in real-time'}</p>
        <textarea id="scriptEditor" class="script-editor"></textarea>
      </div>
      <div class="preview-container">
        <h4>${t.previewTitle || 'Parsing Preview'}</h4>
        <p class="help-text">${t.previewHelp || 'Character dialogues are highlighted by color'}</p>
        <div id="parsingPreview" class="script-lines"></div>
      </div>
    </div>
  `;
  
  const scriptEditor = document.getElementById('scriptEditor');
  scriptEditor.value = initialText;
  scriptEditor.addEventListener('input', debounceScriptParsing);
  updateScriptParsing(); // Call this instead of renderParsingPreview to process the editor content
  setupScriptPreviewEvents();
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
  } catch (error) {
    console.error('Error parsing script:', error);
  }
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
  
  Object.entries(characters)
    .sort((a, b) => b[1] - a[1])
    .forEach(([character, count]) => {
      const characterItem = document.createElement('div');
      characterItem.className = 'character-item';
      
      const hash = Array.from(character).reduce((acc, char) => char.charCodeAt(0) + acc, 0);
      const hue = hash % 360;
      const color = `hsl(${hue}, 70%, 60%)`;
      
      characterItem.innerHTML = `
        <span style="color: ${color}; font-weight: bold;">${character}</span>
        <span class="line-count">(${count} ${count === 1 ? 'line' : 'lines'})</span>
      `;
      
      detectedCharactersList.appendChild(characterItem);
    });
  
  if (Object.keys(characters).length === 0) {
    detectedCharactersList.innerHTML = `
      <div class="character-item" style="font-style: italic; opacity: 0.7;">
        No characters detected. Try adding character names followed by a colon.
      </div>
    `;
  }
}

/**
 * Set up event listeners for the script preview
 */
function setupScriptPreviewEvents() {
  const parsingPreview = document.getElementById('parsingPreview');
  const scriptEditor = document.getElementById('scriptEditor');
  
  if (parsingPreview && scriptEditor) {
    parsingPreview.addEventListener('click', (e) => {
      const lineElement = e.target.closest('.script-line');
      if (!lineElement) return;
      
      // Handle line selection for merge operations
      if (e.ctrlKey || e.metaKey) {
        lineElement.classList.toggle('selected');
      } else {
        document.querySelectorAll('.script-line.selected').forEach(el => {
          el.classList.remove('selected');
        });
        lineElement.classList.add('selected');
        
        // Get the line index and text
        const lineIndex = parseInt(lineElement.dataset.index);
        if (!isNaN(lineIndex) && lineIndex >= 0 && lineIndex < cleanedScriptLines.length) {
          // Position in editor
          focusEditorOnLine(scriptEditor, lineIndex);
          
          // Show tooltip hint
          showEditorHint(lineElement);
        }
      }
    });
  }
}

/**
 * Focus the editor on a specific line
 * @param {HTMLElement} editor - The editor element
 * @param {number} lineIndex - The index of the line to focus on
 */
function focusEditorOnLine(editor, lineIndex) {
  if (!editor) return;
  
  // Calculate position for the specified line
  const lines = editor.value.split('\n');
  let position = 0;
  
  // Sum the lengths of all lines before the target line
  for (let i = 0; i < lineIndex; i++) {
    if (i < lines.length) {
      position += lines[i].length + 1; // +1 for the newline character
    }
  }
  
  // Set cursor position and selection range
  editor.focus();
  editor.setSelectionRange(position, position + (lines[lineIndex] ? lines[lineIndex].length : 0));
  
  // Calculate the line height in the editor (approximately)
  const lineHeight = 20; // A reasonable default line height in pixels
  
  // Calculate where the line should be in the editor
  const linePosition = lineIndex * lineHeight;
  
  // We want to scroll to position the line in the middle of the visible area
  const editorMiddle = editor.clientHeight / 2;
  const scrollPosition = linePosition - editorMiddle;
  
  // Scroll to the line, ensuring it's in the middle of the view
  editor.scrollTop = Math.max(0, scrollPosition);
  
  // Ensure text cursor is visible by ensuring it's in view
  // This makes the browser automatically scroll horizontally if needed
  setTimeout(() => {
    editor.blur(); // Temporarily remove focus
    editor.focus(); // Re-focus to trigger browser's scroll-into-view behavior
  }, 50);
  
  // Highlight effect
  highlightEditorLine(editor);
}

/**
 * Add a temporary highlight effect to the selected line in the editor
 * @param {HTMLElement} editor - The editor element
 */
function highlightEditorLine(editor) {
  // Add the highlight class
  editor.classList.add('highlight-line');
  
  // Remove the highlight class after a short delay
  setTimeout(() => {
    editor.classList.remove('highlight-line');
  }, 1500);
}

/**
 * Show a tooltip hint when clicking on a line in the preview
 * @param {HTMLElement} element - The element to show the hint near
 */
function showEditorHint(element) {
  const t = translations[currentLang];
  const hintText = t.clickToEditHint || 'Text highlighted in editor';
  
  // Create or get the hint element
  let hint = document.getElementById('editor-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'editor-hint';
    hint.className = 'editor-hint';
    document.body.appendChild(hint);
  }
  
  // Position the hint near the clicked element
  const rect = element.getBoundingClientRect();
  hint.style.top = `${rect.top + window.scrollY - 30}px`;
  hint.style.left = `${rect.left + window.scrollX}px`;
  hint.textContent = hintText;
  
  // Show the hint
  hint.classList.add('show');
  
  // Hide the hint after a short delay
  setTimeout(() => {
    hint.classList.remove('show');
  }, 2000);
}

/**
 * Debounce the script parsing to avoid excessive updates
 */
function debounceScriptParsing() {
  if (this.parseTimeout) {
    clearTimeout(this.parseTimeout);
  }
  
  this.parseTimeout = setTimeout(() => {
    updateScriptParsing();
  }, 300);
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
  
  cleanedScriptLines.forEach((line, index) => {
    const lineElement = document.createElement('div');
    lineElement.className = 'script-line';
    lineElement.dataset.index = index;
    
    const charMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (charMatch) {
      const character = charMatch[1].trim();
      const dialogue = charMatch[2].trim();
      
      if (!characterColors[character]) {
        characterColors[character] = colors[colorIndex % colors.length];
        colorIndex++;
      }
      
      lineElement.innerHTML = `
        <span class="character-name" style="color: ${characterColors[character]}">${character}:</span>
        <span class="dialogue-text">${dialogue}</span>
      `;
      lineElement.dataset.character = character;
    } else {
      lineElement.innerHTML = `<span class="stage-direction">${line}</span>`;
    }
    
    parsingPreview.appendChild(lineElement);
  });
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
