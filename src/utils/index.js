/**
 * Shows a toast notification message
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the message (ms)
 * @param {string} type - Optional message type (info, success, error, warning)
 */
export const showToast = (message, duration = 2000, type = 'info') => {
  // Create toast element if it doesn't exist
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  // Clear any existing timeout
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }
  
  // Set the message and type
  toast.textContent = message;
  toast.className = `toast toast-${type} toast-visible`;
  
  // Hide the toast after the duration
  toast.timeoutId = setTimeout(() => {
    toast.className = 'toast';
  }, duration);
};

/**
 * Handle swipe gestures
 * @param {number} startX - Starting X position
 * @param {number} endX - Ending X position
 * @param {Object} callbacks - Callback functions for swipe directions
 */
export const handleSwipeGesture = (startX, endX, callbacks) => {
  const threshold = 100; // Minimum distance for a swipe
  const diff = endX - startX;
  
  if (Math.abs(diff) < threshold) return; // Not a swipe
  
  if (diff > 0 && callbacks.onRight) {
    callbacks.onRight();
  } else if (diff < 0 && callbacks.onLeft) {
    callbacks.onLeft();
  }
};

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @return {Function} - Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

/**
 * Copy text to clipboard with fallback
 * @param {string} text - Text to copy
 * @return {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (text) => {
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
};

/**
 * Remove HTML tags and return plain text content
 * @param {string} line - The line that might contain HTML tags
 * @returns {string} - The plain text content
 */
export const getPlainText = (line) => {
  // Handle null or undefined
  if (line == null) return '';
  
  // Remove HTML tags and trim whitespace
  return line.replace(/<[^>]*>/g, '').trim();
};

/**
 * Create a valid DOM ID from a string
 * @param {string} str - The input string
 * @returns {string} - A valid DOM ID
 */
export const createValidId = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

/**
 * Read file content as text
 * @param {File} file - The file to read
 * @returns {Promise<string>} - The file content as text
 */
export const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};
