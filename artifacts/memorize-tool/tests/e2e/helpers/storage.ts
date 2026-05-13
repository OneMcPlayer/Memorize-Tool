import type { Page } from "@playwright/test";

const ACCESS_TOKEN = process.env.PLAYWRIGHT_ACCESS_TOKEN ?? "e2e-token";

export async function seedAppStorage(
  page: Page,
  values: Record<string, string> = {},
): Promise<void> {
  await page.addInitScript(
    ({ accessToken, values: storageValues }) => {
      localStorage.clear();

      const firstPathSegment = window.location.pathname
        .split("/")
        .filter(Boolean)[0];

      const setScopedValue = (key: string, value: string) => {
        localStorage.setItem(key, value);
        localStorage.setItem(`${key}:/`, value);
        if (firstPathSegment) {
          localStorage.setItem(`${key}:/${firstPathSegment}`, value);
        }
      };

      setScopedValue("mainAccessToken", accessToken);

      Object.entries(storageValues).forEach(([key, value]) => {
        setScopedValue(key, value);
      });
    },
    { accessToken: ACCESS_TOKEN, values },
  );
}
