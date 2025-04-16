import { showToast } from './utils.js';
import { translations } from './translations.js';
import scriptLibrary from './data/scriptLibraryInstance.js';
import { initEventListeners } from './core/eventListeners.js';
import { renderInputView } from './core/views.js';
import { initializeSettings } from './core/settings.js';
import { ErrorHandler } from './utils/ErrorHandler.js';

// Initialize the application
async function initializeApp() {
  try {
    // Initialize error handling
    ErrorHandler.initialize(error => {
      showToast(error.message, 3000, 'error');
    });
    
    // Initialize user settings from localStorage
    initializeSettings();
    
    // Initialize script library
    await scriptLibrary.initialize();
    
    // Set up event listeners
    initEventListeners();
    
    // Render the initial view
    renderInputView();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showToast('Error loading scripts', 3000, 'error');
  }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);