export function appBasePath(): string {
  const rawBase = import.meta.env.BASE_URL ?? "/";
  const base = rawBase.trim() || "/";
  const normalized = base.startsWith("/") ? base : `/${base}`;
  const withoutTrailingSlash = normalized.replace(/\/+$/, "");
  return withoutTrailingSlash === "" ? "" : withoutTrailingSlash;
}

export function apiPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${appBasePath()}/api${normalizedPath}`;
}
