import { apiPath } from "./apiPath";

const STORAGE_KEY = "mainAccessToken";

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* ignore */
  }
  emit(token);
}

export function clearAccessToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  emit(null);
}

export function subscribeAccessToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(token: string | null): void {
  listeners.forEach((l) => {
    try {
      l(token);
    } catch {
      /* ignore */
    }
  });
}

/**
 * Adds the access-token header to a `HeadersInit`-shaped object.
 * Use for raw `fetch` calls that bypass the shared `customFetch` helper.
 */
export function withAccessTokenHeader(
  headers: Record<string, string> = {},
): Record<string, string> {
  const token = getAccessToken();
  if (token) {
    return { ...headers, "X-Access-Token": token };
  }
  return headers;
}

/**
 * Verify a candidate token against the server. Returns true on 200, false on
 * 401, and throws for any other failure (network, 5xx).
 */
export async function verifyAccessToken(token: string): Promise<boolean> {
  const res = await fetch(apiPath("/access/verify"), {
    headers: { "X-Access-Token": token },
    cache: "no-store",
  });
  if (res.ok) return true;
  if (res.status === 401) return false;
  throw new Error(`Verification failed: HTTP ${res.status}`);
}
