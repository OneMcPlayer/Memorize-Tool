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
   * Handle global error events
   * @param {ErrorEvent} event - The error event
   */
  static #handleGlobalError(event) {
    console.error('Global error:', event.error || event.message);
    
    if (this.#errorCallback) {
      this.#errorCallback(event.error || new Error(event.message));
    }
    
    // Prevent default browser error handling
    event.preventDefault();
  }
  
  /**
   * Handle unhandled promise rejections
   * @param {PromiseRejectionEvent} event - The rejection event
   */
  static #handlePromiseRejection(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (this.#errorCallback) {
      this.#errorCallback(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    }
    
    // Prevent default browser error handling
    event.preventDefault();
  }
  
  /**
   * Handle an error manually
   * @param {Error|string} error - The error to handle
   */
  static handleError(error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    console.error('Handled error:', errorObj);
    
    if (this.#errorCallback) {
      this.#errorCallback(errorObj);
    }
    
    return errorObj;
  }
  
  /**
   * Wrap a function with error handling
   * @param {Function} fn - The function to wrap
   * @returns {Function} - The wrapped function
   */
  static wrap(fn) {
    return (...args) => {
      try {
        const result = fn(...args);
        
        // Handle promises
        if (result instanceof Promise) {
          return result.catch(error => {
            this.handleError(error);
            throw error; // Re-throw to allow further handling
          });
        }
        
        return result;
      } catch (error) {
        this.handleError(error);
        throw error; // Re-throw to allow further handling
      }
    };
  }
}
