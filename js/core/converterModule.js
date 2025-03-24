import { translations } from '/Memorize-Tool/js/translations.js';
import { showToast } from '/Memorize-Tool/js/utils.js';
import { ScriptConverter } from '/Memorize-Tool/js/services/ScriptConverter.js';
import { currentLang } from './settings.js';
import { renderInputView } from './views.js';
import { createValidId } from './utils.js';

// Track current step in the conversion process
let currentStep = 1;
let parseResult = null;

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
  
  if (backButton) {
    backButton.addEventListener('click', renderInputView);
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
        // Going from step 1 to 2 requires parsing
        parseScript();
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
    showToast(t.errorNoInput, 3000, 'error');
    return;
  }
  
  try {
    parseResult = ScriptConverter.parseBasicScript(inputText);
    
    // Update metadata fields - add title field with required indicator
    const titleLabel = document.querySelector('label[for="scriptTitle"]');
    if (titleLabel) {
      titleLabel.innerHTML = `${translations[currentLang].converter.titleLabel} <span class="required-field">*</span>`;
    }
    
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
    showToast(t.successParse, 2000, 'success');
    
    // Move to step 2
    showStep(2);
    
  } catch (error) {
    console.error('Error parsing script:', error);
    showToast(t.errorParse, 3000, 'error');
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
