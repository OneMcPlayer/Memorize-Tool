import { handleSwipeGesture } from '/Memorize-Tool/js/utils.js';
import { setLanguage, toggleDarkMode, setAdvancedMode } from './settings.js';
import { renderInputView, renderConverterView } from './views.js';

let touchStartX = 0;

/**
 * Initialize all global event listeners
 */
export function initEventListeners() {
  // Language selector
  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    langSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value);
      renderInputView();
    });
  }

  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleDarkMode);
  }

  // Options menu
  setupOptionsMenu();
  
  // Touch events for swipe gestures
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture(touchStartX, touchEndX, {
      onRight: () => document.getElementById('revealButton')?.click(),
      onLeft: () => document.getElementById('nextButton')?.click()
    });
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyPress);
}

/**
 * Set up the options menu
 */
function setupOptionsMenu() {
  const optionsToggle = document.getElementById('optionsToggle');
  const optionsMenu = document.getElementById('optionsMenu');
  
  if (optionsToggle && optionsMenu) {
    // Toggle menu visibility
    optionsToggle.addEventListener('click', () => {
      if (optionsMenu.style.display === 'none' || optionsMenu.style.display === '') {
        optionsMenu.style.display = 'block';
      } else {
        optionsMenu.style.display = 'none';
      }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#optionsToggle') && !e.target.closest('#optionsMenu')) {
        optionsMenu.style.display = 'none';
      }
    });
    
    // Advanced mode toggle
    const advancedModeToggle = document.getElementById('advancedModeToggle');
    if (advancedModeToggle) {
      advancedModeToggle.addEventListener('change', (e) => {
        setAdvancedMode(e.target.checked);
        renderInputView();
      });
    }
    
    // Converter option
    const optionConverter = document.getElementById('optionConverter');
    if (optionConverter) {
      optionConverter.addEventListener('click', () => {
        renderConverterView();
        optionsMenu.style.display = 'none';
      });
    }
  }
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleKeyPress(e) {
  // Do not trigger shortcuts while typing in text fields
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  
  if (e.key === 'Enter') {
    const nextBtn = document.getElementById('nextButton');
    const extractBtn = document.getElementById('extractButton');
    if (nextBtn && nextBtn.style.display !== 'none') {
      nextBtn.click();
    } else if (extractBtn) {
      extractBtn.click();
    }
  } else if (e.key === ' ') {
    const revealBtn = document.getElementById('revealButton');
    if (revealBtn) {
      e.preventDefault();
      revealBtn.click();
    }
  } else if (e.key === 'Escape') {
    renderInputView();
  }
}
