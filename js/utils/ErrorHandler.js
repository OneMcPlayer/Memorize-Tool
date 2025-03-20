/**
 * A utility class for centralized error handling
 */
export class ErrorHandler {
  static #isInitialized = false;
  static #errorCallback = null;
  
  /**
   * Initialize the global error handler
   * @param {Function} errorCallback - Function to call with error details
   */
  static initialize(errorCallback) {
    if (this.#isInitialized) return;
    
    this.#errorCallback = errorCallback;
    
    // Set up global error handling
    window.addEventListener('error', this.#handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.#handlePromiseRejection.bind(this));
    
    this.#isInitialized = true;
    console.debug('Global error handler initialized');
  }
  
  /**
   * Handle a caught error
   * @param {Error} error - The error object
   * @param {string} context - Where the error occurred
   * @param {boolean} isFatal - Whether this is a fatal error
   */
  static handleError(error, context, isFatal = false) {
    console.error(`Error in ${context}:`, error);
    
    // Call the error callback if provided
    if (this.#errorCallback) {
      this.#errorCallback({
        message: error.message,
        stack: error.stack,
        context,
        isFatal
      });
    }
    
    // For fatal errors, you might want additional handling
    if (isFatal) {
      this.#handleFatalError(error, context);
    }
  }
  
  /**
   * Handle global uncaught errors
   * @private
   */
  static #handleGlobalError(event) {
    const { message, filename, lineno, colno, error } = event;
    console.error('Uncaught error:', message);
    
    if (this.#errorCallback) {
      this.#errorCallback({
        message,
        location: `${filename}:${lineno}:${colno}`,
        stack: error?.stack,
        context: 'Uncaught exception',
        isFatal: true
      });
    }
    
    // Prevent the browser from showing its own error dialog
    event.preventDefault();
  }
  
  /**
   * Handle unhandled promise rejections
   * @private
   */
  static #handlePromiseRejection(event) {
    const { reason } = event;
    console.error('Unhandled promise rejection:', reason);
    
    if (this.#errorCallback) {
      this.#errorCallback({
        message: reason?.message || String(reason),
        stack: reason?.stack,
        context: 'Unhandled promise rejection',
        isFatal: false
      });
    }
    
    // Prevent the browser from showing its own error dialog
    event.preventDefault();
  }
  
  /**
   * Handle fatal errors that require app restart
   * @private
   */
  static #handleFatalError(error, context) {
    console.error('FATAL ERROR:', error);
    // Implement any app-specific fatal error recovery here
  }
}
