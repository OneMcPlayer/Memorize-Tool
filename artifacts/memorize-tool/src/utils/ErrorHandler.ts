export class ErrorHandler {
  static #isInitialized = false;
  static #errorCallback: ((error: Error) => void) | null = null;

  static initialize(errorCallback: (error: Error) => void) {
    if (this.#isInitialized) return;

    this.#errorCallback = errorCallback;

    window.addEventListener('error', this.#handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.#handlePromiseRejection.bind(this));

    this.#isInitialized = true;
  }

  static #handleGlobalError(event: ErrorEvent) {
    console.error('Global error:', event.error || event.message);

    if (this.#errorCallback) {
      this.#errorCallback(event.error || new Error(event.message));
    }

    event.preventDefault();
  }

  static #handlePromiseRejection(event: PromiseRejectionEvent) {
    console.error('Unhandled promise rejection:', event.reason);

    if (this.#errorCallback) {
      this.#errorCallback(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason))
      );
    }

    event.preventDefault();
  }

  static handleError(error: Error | string): Error {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    console.error('Handled error:', errorObj);

    if (this.#errorCallback) {
      this.#errorCallback(errorObj);
    }

    return errorObj;
  }

  static wrap<T extends (...args: unknown[]) => unknown>(fn: T): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);

        if (result instanceof Promise) {
          return result.catch((error: Error) => {
            this.handleError(error);
            throw error;
          });
        }

        return result;
      } catch (error) {
        this.handleError(error as Error);
        throw error;
      }
    }) as T;
  }
}
