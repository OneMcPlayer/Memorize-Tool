import { handleSwipeGesture, showToast } from '../utils.js';
import { setLanguage, toggleDarkMode, setAdvancedMode, currentLang } from './settings.js';
import { renderInputView, renderConverterView } from './views.js';
import { translations } from '../translations.js';

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
 * Check if the device is mobile based on screen width
 * @returns {boolean} true if the device is mobile
 */
function isMobileDevice() {
  return window.innerWidth < 1024; // Consider under 1024px as mobile/tablet
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
      // Hide converter option on mobile devices
      if (isMobileDevice()) {
        optionConverter.style.display = 'none';
      }
      
      optionConverter.addEventListener('click', () => {
        if (isMobileDevice()) {
          showToast(translations[currentLang].converter.mobileNotSupported || 'Converter is only available on desktop devices', 3000, 'warning');
          return;
        }
        renderConverterView();
        optionsMenu.style.display = 'none';
      });
    }
  }
}

// Listen for window resize to hide/show converter option
window.addEventListener('resize', () => {
  const optionConverter = document.getElementById('optionConverter');
  if (optionConverter) {
    if (isMobileDevice()) {
      optionConverter.style.display = 'none';
    } else {
      optionConverter.style.display = 'list-item';
    }
  }
});

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
