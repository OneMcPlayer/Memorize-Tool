import { appBasePath } from "./apiPath";

function scopedKey(key: string): string {
  return `${key}:${appBasePath() || "/"}`;
}

function shouldReadLegacyKey(): boolean {
  return appBasePath() === "";
}

export function getScopedStorageItem(key: string): string | null {
  try {
    const scopedValue = localStorage.getItem(scopedKey(key));
    if (scopedValue !== null) return scopedValue;
    return shouldReadLegacyKey() ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function setScopedStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(scopedKey(key), value);
    if (shouldReadLegacyKey()) {
      localStorage.setItem(key, value);
    }
  } catch {
    /* ignore */
  }
}

export function removeScopedStorageItem(key: string): void {
  try {
    localStorage.removeItem(scopedKey(key));
    if (shouldReadLegacyKey()) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}
