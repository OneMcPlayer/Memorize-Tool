// Enhanced utility functions

/**
 * Shows a toast notification message
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the message (ms)
 * @param {string} type - Optional message type (info, success, error, warning)
 */
export function showToast(message, duration = 2000, type = 'info') {
  const toast = document.querySelector('.toast');
  if (!toast) {
    console.warn('Toast element not found');
    return;
  }
  
  // Clear any existing classes and timeouts
  toast.className = 'toast';
  clearTimeout(toast.dataset.timeoutId);
  
  // Add type-specific class
  toast.classList.add(`toast-${type}`);
  
  // Set message and display
  toast.textContent = message;
  toast.style.display = 'block';
  
  // Store timeout ID to allow clearing later
  const timeoutId = setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
  
  toast.dataset.timeoutId = timeoutId;
}

/**
 * Handle swipe gestures for touch devices
 * @param {number} touchStartX - X coordinate where touch started
 * @param {number} touchEndX - X coordinate where touch ended
 * @param {Object} callbacks - Object with onLeft and onRight handler functions
 * @param {number} threshold - Minimum distance to register as a swipe
 */
export function handleSwipeGesture(touchStartX, touchEndX, callbacks, threshold = 50) {
  const diff = touchEndX - touchStartX;
  if (Math.abs(diff) < threshold) return;

  if (diff > 0) {
    callbacks.onRight?.();
  } else {
    callbacks.onLeft?.();
  }
}

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @return {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Copy text to clipboard with fallback
 * @param {string} text - Text to copy
 * @return {Promise<boolean>} - Success status
 */
export async function copyToClipboard(text) {
  try {
    // Modern approach
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
}

/**
 * Check if the app is running in dark mode
 * @return {boolean} - True if dark mode is active
 */
export function isDarkMode() {
  return document.body.classList.contains('dark-mode');
}