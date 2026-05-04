export const showToast = (message: string, duration = 2000, type = 'info') => {
  let toast = document.querySelector('.toast') as HTMLElement & { timeoutId?: ReturnType<typeof setTimeout> };
  if (!toast) {
    toast = document.createElement('div') as HTMLElement & { timeoutId?: ReturnType<typeof setTimeout> };
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }

  toast.textContent = message;
  toast.className = `toast toast-${type} toast-visible`;

  toast.timeoutId = setTimeout(() => {
    toast.className = 'toast';
  }, duration);
};

export const handleSwipeGesture = (
  startX: number,
  endX: number,
  callbacks: { onRight?: () => void; onLeft?: () => void }
) => {
  const threshold = 100;
  const diff = endX - startX;

  if (Math.abs(diff) < threshold) return;

  if (diff > 0 && callbacks.onRight) {
    callbacks.onRight();
  } else if (diff < 0 && callbacks.onLeft) {
    callbacks.onLeft();
  }
};

export const debounce = <T extends (...args: unknown[]) => unknown>(func: T, wait = 300) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

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

export const getPlainText = (line: string | null | undefined): string => {
  if (line == null) return '';

  let result = line;
  let previous: string;
  do {
    previous = result;
    result = result.replace(/<[^>]*>/g, '');
  } while (result !== previous);
  return result.trim();
};

export const createValidId = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

export const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};
