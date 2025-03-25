import { translations } from '/Memorize-Tool/js/translations.js';
import { showToast } from '/Memorize-Tool/js/utils.js';
import { ScriptConverter } from '/Memorize-Tool/js/services/ScriptConverter.js';
import { ScriptProcessor } from '/Memorize-Tool/js/services/ScriptProcessor.js';
import { currentLang } from './settings.js';
import { renderInputView } from './views.js';
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
  
  // New cleaning step buttons
  const autoDetectButton = document.getElementById('autoDetectButton');
  const mergeButton = document.getElementById('mergeButton');
  const splitButton = document.getElementById('splitButton');
  
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
  
  // Set up cleaning step buttons
  if (autoDetectButton) {
    autoDetectButton.addEventListener('click', () => autoDetectCharacters());
  }
  
  if (mergeButton) {
    mergeButton.addEventListener('click', () => mergeSelectedLines());
  }
  
  if (splitButton) {
    splitButton.addEventListener('click', () => splitAtCursor());
  }
  
  // Set up back button handlers
  if (backButton) {
    backButton.addEventListener('click', () => {
      // Clear any state if needed
      parseResult = null;
      cleanedScriptLines = [];
      currentStep = 1;
      renderInputView();
    });
  }
  
  if (topBackButton) {
    topBackButton.addEventListener('click', () => {
      // Ask for confirmation if user has made changes
      if (parseResult || currentStep > 1) {
        if (confirm(translations[currentLang].confirmLeave || 'Leave converter? Your changes will be lost.')) {
          parseResult = null;
          cleanedScriptLines = [];
          currentStep = 1;
          renderInputView();
        }
      } else {
        parseResult = null;
        cleanedScriptLines = [];
        currentStep = 1;
        renderInputView();
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
        // Going from step 1 to 2 - parse script and prepare cleaning UI
        prepareCleaningView();
      } else if (targetStep === 3) {
        // Going from step 2 to 3 - finalize the cleaned script
        finalizeCleanedScript();
      } else if (targetStep === 4) {
        // Going from step 3 to 4 (previously step 2 to 3)
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
  
  // Set up line selection in the script preview
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
  
  // Update step indicator
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
    
    // Move to the cleaning step
    showStep(2);
    
    // Initialize the script cleaning view
    prepareCleaningView();
    
  } catch (error) {
    console.error('Error parsing script:', error);
    showToast(t.errorParse || 'Error parsing script', 3000, 'error');
  }
}

/**
 * Prepare the script cleaning view with the parsed script
 */
function prepareCleaningView() {
  if (!parseResult || !parseResult.processedLines) {
    showToast(translations[currentLang].errorParse || 'Invalid script data', 3000, 'error');
    return;
  }
  
  // Store initial processed lines
  cleanedScriptLines = [...parseResult.processedLines];
  
  // Render the script preview with character detection
  renderScriptPreview();
  
  // Show detected characters summary
  updateDetectedCharactersList();
}

/**
 * Render the script preview with character detection highlighting
 */
function renderScriptPreview() {
  const scriptPreview = document.getElementById('scriptPreview');
  if (!scriptPreview) return;
  
  scriptPreview.innerHTML = '';
  
  // Create a container for lines that allows selection
  const linesContainer = document.createElement('div');
  linesContainer.className = 'script-lines';
  
  // Track lines by character for coloring
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
    
    // Check if this is a character line
    const charMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (charMatch) {
      const character = charMatch[1].trim();
      const dialogue = charMatch[2].trim();
      
      // Assign color to character if not already assigned
      if (!characterColors[character]) {
        characterColors[character] = colors[colorIndex % colors.length];
        colorIndex++;
      }
      
      // Create styled elements for character and dialogue
      lineElement.innerHTML = `
        <span class="character-name" style="color: ${characterColors[character]}">${character}:</span>
        <span class="dialogue-text">${dialogue}</span>
      `;
      lineElement.dataset.character = character;
    } else {
      // This is likely a stage direction or other non-dialogue text
      lineElement.innerHTML = `<span class="stage-direction">${line}</span>`;
    }
    
    // Make line selectable
    lineElement.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Add to selection with Ctrl/Cmd key
        lineElement.classList.toggle('selected');
      } else {
        // Clear selection and select just this line
        document.querySelectorAll('.script-line.selected').forEach(el => {
          el.classList.remove('selected');
        });
        lineElement.classList.add('selected');
      }
    });
    
    linesContainer.appendChild(lineElement);
  });
  
  scriptPreview.appendChild(linesContainer);
}

/**
 * Update the list of detected characters in the script
 */
function updateDetectedCharactersList() {
  const charactersList = document.getElementById('detectedCharactersList');
  if (!charactersList) return;
  
  // Extract all characters from script lines
  const characters = new Set();
  cleanedScriptLines.forEach(line => {
    const match = line.match(/^([^:]+):/);
    if (match) {
      characters.add(match[1].trim());
    }
  });
  
  // Create the character list with count of lines
  charactersList.innerHTML = '';
  if (characters.size === 0) {
    charactersList.innerHTML = '<p>No character dialogues detected</p>';
    return;
  }
  
  const characterCounts = {};
  cleanedScriptLines.forEach(line => {
    const match = line.match(/^([^:]+):/);
    if (match) {
      const character = match[1].trim();
      characterCounts[character] = (characterCounts[character] || 0) + 1;
    }
  });
  
  // Sort characters by line count
  const sortedCharacters = Array.from(characters).sort((a, b) => {
    return characterCounts[b] - characterCounts[a];
  });
  
  // Create list items
  sortedCharacters.forEach(character => {
    const characterItem = document.createElement('div');
    characterItem.className = 'character-item';
    characterItem.innerHTML = `
      <span class="character-name">${character}</span>
      <span class="line-count">(${characterCounts[character]} ${characterCounts[character] === 1 ? 'line' : 'lines'})</span>
    `;
    charactersList.appendChild(characterItem);
  });
}

/**
 * Set up event listeners for the script preview
 */
function setupScriptPreviewEvents() {
  // Setup will be automatic once the script preview is rendered
}

/**
 * Auto-detect characters in the script more aggressively
 */
function autoDetectCharacters() {
  const t = translations[currentLang];
  
  try {
    // Re-process the script with more aggressive character detection
    const inputText = cleanedScriptLines.join('\n');
    const processedLines = ScriptProcessor.preProcessScript(inputText, { aggressiveDetection: true });
    
    // Confirm with user before replacing
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
  
  // Get the indices of selected lines
  const indices = Array.from(selectedLines).map(line => parseInt(line.dataset.index)).sort((a, b) => a - b);
  
  // Determine which character to use (default to first line's character)
  let targetCharacter = null;
  const firstLine = cleanedScriptLines[indices[0]];
  const charMatch = firstLine.match(/^([^:]+):/);
  if (charMatch) {
    targetCharacter = charMatch[1].trim();
  } else {
    // If first line doesn't have a character, prompt to select one
    const characterOptions = new Set();
    indices.forEach(idx => {
      const match = cleanedScriptLines[idx].match(/^([^:]+):/);
      if (match) characterOptions.add(match[1].trim());
    });
    
    if (characterOptions.size > 0) {
      // Use the first available character
      targetCharacter = Array.from(characterOptions)[0];
    } else {
      // No characters found, ask user to input one
      targetCharacter = prompt(t.enterCharacterName || 'Enter character name for merged lines:');
      if (!targetCharacter) return; // User cancelled
    }
  }
  
  // Gather dialogue parts from all selected lines
  let mergedDialogue = '';
  indices.forEach(idx => {
    const line = cleanedScriptLines[idx];
    const dialogueMatch = line.match(/^([^:]+):\s*(.+)$/);
    
    if (dialogueMatch) {
      // Line already has character:dialogue format
      mergedDialogue += ' ' + dialogueMatch[2].trim();
    } else {
      // Add whole line as dialogue
      mergedDialogue += ' ' + line.trim();
    }
  });
  
  mergedDialogue = mergedDialogue.trim();
  
  // Create new merged line
  const mergedLine = `${targetCharacter}: ${mergedDialogue}`;
  
  // Replace the first occurrence with the merged line and remove the rest
  cleanedScriptLines[indices[0]] = mergedLine;
  
  // Remove the other lines (in reverse order to avoid index shifting)
  for (let i = indices.length - 1; i > 0; i--) {
    cleanedScriptLines.splice(indices[i], 1);
  }
  
  // Update the view
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

/**
 * Finalize the cleaned script before moving to metadata editing
 */
function finalizeCleanedScript() {
  const t = translations[currentLang];
  
  if (cleanedScriptLines.length === 0) {
    showToast(t.errorNoLines || 'No script lines to process', 3000, 'error');
    return;
  }
  
  try {
    // Update the parseResult to use our cleaned script lines
    parseResult.processedLines = cleanedScriptLines;
    
    // Re-detect roles based on the cleaned script
    parseResult.roles = ScriptProcessor.extractRolesFromPlainText(cleanedScriptLines);
    
    // Update metadata fields
    document.getElementById('scriptTitle').value = parseResult.title || '';
    document.getElementById('scriptAuthor').value = parseResult.author || '';
    document.getElementById('scriptDate').value = parseResult.date || '';
    document.getElementById('scriptDescription').value = parseResult.description || '';
    
    // Clear existing roles
    const rolesContainer = document.getElementById('rolesContainer');
    rolesContainer.innerHTML = '';
    
    // Add roles from parse result
    if (parseResult.roles && parseResult.roles.length) {
      parseResult.roles.forEach(role => addRoleField(role));
    } else {
      // Add at least one empty role field
      addRoleField();
    }
    
    // Show success message
    showToast(t.cleanSuccess || 'Script cleaned successfully', 2000, 'success');
    
    // Move to step 3 (metadata editing)
    showStep(3);
    
  } catch (error) {
    console.error('Error finalizing cleaned script:', error);
    showToast(t.errorClean || 'Error processing cleaned script', 3000, 'error');
  }
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
  
  // Add event listener to the remove button
  const removeButton = rolesContainer.querySelector(`#${roleId} .remove-role`);
  if (removeButton) {
    removeButton.addEventListener('click', () => {
      const roleElement = document.getElementById(roleId);
      // Add fade-out animation before removing
      roleElement.classList.add('fade-out');
      // Remove after animation completes
      setTimeout(() => {
        roleElement.remove();
        // If no roles left, add an empty one
        if (rolesContainer.querySelectorAll('.role-field').length === 0) {
          addRoleField();
        }
      }, 300);
    });
  }
  
  // Auto-focus the name field if it's empty
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
  
  // Scroll to the bottom of the roles container with animation
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
    // Get metadata
    const metadata = {
      title: document.getElementById('scriptTitle').value,
      author: document.getElementById('scriptAuthor').value,
      date: document.getElementById('scriptDate').value,
      description: document.getElementById('scriptDescription').value
    };
    
    // Validate title is provided
    if (!metadata.title.trim()) {
      document.getElementById('scriptTitle').classList.add('field-error');
      showToast(t.errorNoTitle || 'Please enter a script title', 3000, 'error');
      setTimeout(() => document.getElementById('scriptTitle').classList.remove('field-error'), 2000);
      return;
    }
    
    // Get roles
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
        // Highlight empty required fields
        nameInput.classList.add('field-error');
        setTimeout(() => nameInput.classList.remove('field-error'), 2000);
      }
    });
    
    if (!hasValidRoles) {
      showToast(t.errorNoRoles || 'Please add at least one character with a name', 3000, 'error');
      return;
    }
    
    // Get original input text
    const inputText = document.getElementById('converterInput').value;
    
    // Generate structured format
    const structuredScript = ScriptConverter.generateStructuredScript(inputText, metadata, roles);
    
    // Update output area
    document.getElementById('converterOutput').value = structuredScript;
    
    // Show success message
    showToast(t.successExport, 2000, 'success');
    
    // Move to final step
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
  
  // Get title from metadata or use a default
  const title = document.getElementById('scriptTitle').value.trim() || 'script';
  const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  
  // Create download link
  const blob = new Blob([outputText], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = `${safeTitle}.script`;
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  
  showToast(t.successDownload || 'Script downloaded!', 2000, 'success');
}
