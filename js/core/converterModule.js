import { translations } from '/Memorize-Tool/js/translations.js';
import { showToast } from '/Memorize-Tool/js/utils.js';
import { ScriptConverter } from '/Memorize-Tool/js/services/ScriptConverter.js';
import { currentLang } from './settings.js';
import { renderInputView } from './views.js';
import { createValidId } from './utils.js';

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
    const result = ScriptConverter.parseBasicScript(inputText);
    
    // Update metadata fields
    document.getElementById('scriptTitle').value = result.title || '';
    document.getElementById('scriptAuthor').value = result.author || '';
    document.getElementById('scriptDate').value = result.date || '';
    document.getElementById('scriptDescription').value = result.description || '';
    
    // Clear existing roles
    const rolesContainer = document.getElementById('rolesContainer');
    rolesContainer.innerHTML = '';
    
    // Add roles from parse result
    if (result.roles && result.roles.length) {
      result.roles.forEach(role => addRoleField(role));
    } else {
      // Add at least one empty role field
      addRoleField();
    }
    
    // Show success message
    showToast(t.successParse, 2000, 'success');
    
    // Enable export section
    document.getElementById('exportSection').classList.remove('hidden');
    
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
      <div class="form-group">
        <label>${t.roleName}</label>
        <input type="text" class="role-name" value="${roleData.primaryName || ''}">
      </div>
      <div class="form-group">
        <label>${t.roleAliases}</label>
        <input type="text" class="role-aliases" value="${(roleData.aliases || []).join(', ')}">
      </div>
      <div class="form-group">
        <label>${t.roleDescription}</label>
        <input type="text" class="role-description" value="${roleData.description || ''}">
      </div>
      <button type="button" class="remove-role">❌</button>
    </div>
  `;
  
  rolesContainer.insertAdjacentHTML('beforeend', roleHtml);
  
  // Add event listener to the remove button
  const removeButton = rolesContainer.querySelector(`#${roleId} .remove-role`);
  if (removeButton) {
    removeButton.addEventListener('click', () => {
      document.getElementById(roleId).remove();
    });
  }
}

/**
 * Add a new empty role field
 */
function addNewRoleField() {
  addRoleField();
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
    
    // Get roles
    const roles = [];
    document.querySelectorAll('.role-field').forEach(field => {
      const nameInput = field.querySelector('.role-name');
      if (nameInput && nameInput.value.trim()) {
        roles.push({
          primaryName: nameInput.value.trim(),
          aliases: field.querySelector('.role-aliases').value
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
          description: field.querySelector('.role-description').value.trim()
        });
      }
    });
    
    // Get original input text
    const inputText = document.getElementById('converterInput').value;
    
    // Generate structured format
    const structuredScript = ScriptConverter.generateStructuredScript(inputText, metadata, roles);
    
    // Update output area
    document.getElementById('converterOutput').value = structuredScript;
    
    // Show success message
    showToast(t.successExport, 2000, 'success');
    
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
