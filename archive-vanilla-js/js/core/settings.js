// Application settings management

// Settings state
export let currentLang = 'en';
export let isAdvancedMode = false;
export let isDarkMode = false;

/**
 * Initialize settings from localStorage
 */
export function initializeSettings() {
  // Load language preference
  currentLang = localStorage.getItem('lang') || 'en';
  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    langSelect.value = currentLang;
  }
  
  // Load theme preference
  isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  }
  
  // Load advanced mode preference
  isAdvancedMode = localStorage.getItem('advancedMode') === 'true';
}

/**
 * Update the application language
 * @param {string} lang - The language code to set
 */
export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
}

/**
 * Toggle dark mode
 * @returns {boolean} - The new dark mode state
 */
export function toggleDarkMode() {
  // Add a console log for debugging
  console.log('toggleDarkMode called, before toggle:', document.body.classList.contains('dark-mode'));
  
  // Explicitly add or remove the class instead of toggling
  if (document.body.classList.contains('dark-mode')) {
    document.body.classList.remove('dark-mode');
    isDarkMode = false;
  } else {
    document.body.classList.add('dark-mode');
    isDarkMode = true;
  }
  
  // Add another console log after the change
  console.log('After toggle, isDarkMode:', isDarkMode, 'Body has class:', document.body.classList.contains('dark-mode'));
  
  // Save to localStorage
  localStorage.setItem('darkMode', isDarkMode);
  
  // Return the current state
  return isDarkMode;
}

/**
 * Set advanced mode
 * @param {boolean} enabled - Whether to enable advanced mode
 */
export function setAdvancedMode(enabled) {
  isAdvancedMode = enabled;
  localStorage.setItem('advancedMode', isAdvancedMode);
}
