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
  // Force a proper redraw by using setTimeout with 0 delay
  setTimeout(() => {
    document.body.classList.toggle('dark-mode');
    isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    
    // Dispatch a custom event for any components that need to react to theme changes
    const themeChangeEvent = new CustomEvent('themechange', { 
      detail: { isDarkMode } 
    });
    document.dispatchEvent(themeChangeEvent);
  }, 0);
  
  return !isDarkMode; // Return the anticipated state for immediate feedback
}

/**
 * Set advanced mode
 * @param {boolean} enabled - Whether to enable advanced mode
 */
export function setAdvancedMode(enabled) {
  isAdvancedMode = enabled;
  localStorage.setItem('advancedMode', isAdvancedMode);
}
