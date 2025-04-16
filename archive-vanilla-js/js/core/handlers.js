import { showToast } from '../utils.js';
import { translations } from '../translations.js';
import { Script } from '../models/Script.js';
import { ScriptProcessor } from '../services/ScriptProcessor.js';
import scriptLibrary from '../data/scriptLibraryInstance.js';
import { currentLang } from './settings.js';
import { 
  scriptLines, 
  setScriptLines, 
  setExtractedLines, 
  setPrecedingCount 
} from './state.js';
import { renderPracticeView } from './views.js';

/**
 * Set up all input handlers for the input view
 */
export async function setupInputHandlers() {
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

  // Update library script selection dropdown
  if (librarySelect) {
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

  const scriptInput = document.getElementById('scriptInput');
  if (scriptInput) {
    scriptInput.addEventListener('input', () => {
      const text = scriptInput.value;
      if (text) {
        const preprocessed = ScriptProcessor.preProcessScript(text);
        const roles = ScriptProcessor.extractRolesFromPlainText(preprocessed);
        if (roles.length) {
          populateRoleSelect(roles);
          document.getElementById('roleSelectContainer').style.display = 'block';
        }
      }
    });
  }

  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(tab => {
    tab.addEventListener('click', () => {
      // Reset role selection when switching tabs
      const roleSelectContainer = document.getElementById('roleSelectContainer');
      if (tab.dataset.tab === 'paste') {
        // For paste tab, check if there's already text to parse roles from
        const scriptInput = document.getElementById('scriptInput');
        if (scriptInput && scriptInput.value) {
          const preprocessed = ScriptProcessor.preProcessScript(scriptInput.value);
          const roles = ScriptProcessor.extractRolesFromPlainText(preprocessed);
          if (roles.length) {
            populateRoleSelect(roles);
            roleSelectContainer.style.display = 'block';
            return;
          }
        }
      }
      roleSelectContainer.style.display = 'none';
    });
  });
}

/**
 * Populate the role selection dropdown
 * @param {Array} roles - Array of role objects
 */
export function populateRoleSelect(roles) {
  const roleSelect = document.getElementById('roleSelect');
  roleSelect.innerHTML = `<option value="">${translations[currentLang].selectRole}</option>`;
  
  roles.forEach((role, index) => {
    const option = document.createElement('option');
    option.textContent = role.primaryName;
    // Store the role index as value for easy lookup
    option.value = index;
    // Store full role data as a data attribute
    option.dataset.roleData = JSON.stringify({
      primaryName: role.primaryName,
      aliases: role.aliases
    });
    roleSelect.appendChild(option);
  });
}

/**
 * Handle file upload event
 * @param {Event} event - The file input change event
 */
export function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    try {
      // Try to parse as structured script first
      try {
        const script = Script.fromStructuredText(content);
        setScriptLines(ScriptProcessor.preProcessScript(content));
        
        if (script.roles && script.roles.length) {
          populateRoleSelect(script.roles);
          document.getElementById('roleSelectContainer').style.display = 'block';
        }
      } catch (structuredError) {
        // If that fails, treat as plain text
        console.log("Not a structured script, treating as plain text");
        setScriptLines(ScriptProcessor.preProcessScript(content));
        
        // Extract roles from plain text
        const roles = ScriptProcessor.extractRolesFromPlainText(scriptLines);
        if (roles.length) {
          populateRoleSelect(roles);
          document.getElementById('roleSelectContainer').style.display = 'block';
        }
      }
    } catch (error) {
      showToast("Error: Invalid script format");
      console.error(error);
    }
  };
  reader.readAsText(file);
}

/**
 * Handle script library selection
 * @param {Event} event - The select change event
 */
export async function handleLibrarySelection(event) {
  try {
    const scriptId = event.target.value;
    const roleSelectContainer = document.getElementById('roleSelectContainer');
    
    if (!scriptId) {
      roleSelectContainer.style.display = 'none';
      return;
    }

    const selectedScript = await scriptLibrary.loadScript(scriptId);
    if (!selectedScript) {
      showToast("Error: Script not found");
      roleSelectContainer.style.display = 'none';
      return;
    }

    const content = selectedScript.content || selectedScript.text;
    if (!content) {
      showToast("Error: Script has no content");
      roleSelectContainer.style.display = 'none';
      return;
    }

    setScriptLines(ScriptProcessor.preProcessScript(content));
    
    if (selectedScript.roles && selectedScript.roles.length) {
      populateRoleSelect(selectedScript.roles);
      roleSelectContainer.style.display = 'block';
    }
  } catch (error) {
    showToast("Error loading script");
    console.error(error);
  }
}

/**
 * Extract character lines from the script
 */
export async function extractLines() {
  const t = translations[currentLang];
  const scriptInput = document.getElementById('scriptInput');
  const scriptFile = document.getElementById('scriptFile');
  const scriptLibraryEl = document.getElementById('scriptLibrary');
  const roleSelect = document.getElementById('roleSelect');
  const selectedOption = roleSelect.selectedOptions[0];
  
  if (!selectedOption || !selectedOption.value) {
    showToast(t.errorSelectRole || "Please select a character");
    return;
  }

  // Get the full role data including all aliases
  const roleData = JSON.parse(selectedOption.dataset.roleData);

  let currentLines = scriptLines;
  
  // Only process text if we're not using preprocessed lines from library
  if (!document.getElementById('library-tab').classList.contains('hidden')) {
    // Library mode - use existing scriptLines
    if (!scriptLibraryEl.value) {
      showToast(t.errorNoInput);
      return;
    }
  } else if (!document.getElementById('paste-tab') || !document.getElementById('paste-tab').classList.contains('hidden')) {
    // Paste mode
    if (!scriptInput || !scriptInput.value) {
      showToast(t.errorNoInput);
      return;
    }
    currentLines = ScriptProcessor.preProcessScript(scriptInput.value);
  } else {
    // File mode
    if (!scriptFile || !scriptFile.files || !scriptFile.files[0]) {
      showToast(t.errorNoInput);
      return;
    }
    
    // Fix: read file content properly using FileReader
    try {
      const fileContent = await readFileContent(scriptFile.files[0]);
      currentLines = ScriptProcessor.preProcessScript(fileContent);
    } catch (error) {
      showToast(t.errorReadingFile || "Error reading file");
      console.error('Error reading file:', error);
      return;
    }
  }

  if (!currentLines || currentLines.length === 0) {
    showToast(t.errorNoInput);
    return;
  }

  setScriptLines(currentLines);
  setPrecedingCount(parseInt(document.getElementById('precedingCount').value) || 0);
  
  // Extract character lines
  const extractedLines = ScriptProcessor.extractCharacterLines(
    scriptLines, 
    roleData, 
    parseInt(document.getElementById('precedingCount').value) || 0
  );

  if (extractedLines.length === 0) {
    showToast(t.errorNoLines + roleData.primaryName);
    return;
  }

  setExtractedLines(extractedLines);
  renderPracticeView();
}

/**
 * Read file content as text
 * @param {File} file - The file to read
 * @returns {Promise<string>} - The file content
 */
export function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = error => reject(error);
    reader.readAsText(file);
  });
}
