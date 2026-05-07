/**
 * Playwright e2e suite for the Memorize Tool migration.
 *
 * Run via:
 *   pnpm --filter @workspace/memorize-tool exec playwright install --with-deps chromium
 *   pnpm --filter @workspace/memorize-tool exec playwright test
 *
 * The dev workflow (`artifacts/memorize-tool: web` + `artifacts/api-server: API Server`)
 * must be running before invoking the tests; the suite hits the shared proxy at port 80.
 */
import { test, expect, type APIResponse } from "@playwright/test";

test.describe("Memorize Tool — public flow", () => {
  test("loads the app shell with header, options, script picker and online status", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/");
    await expect(page.locator("#root")).not.toBeEmpty({ timeout: 15_000 });
    await expect(page.locator("#optionsToggle")).toBeVisible();
    await expect(page.locator("select").first()).toBeVisible();
    await expect(page.getByText(/API:\s*(Online|Checking)/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("opens and closes the profile/login panel when enabled", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("advancedMode", "true");
      localStorage.setItem("loginEnabled", "true");
    });
    await page.goto("/");
    await expect(page.locator("#profileToggle")).toBeVisible();
    await page.locator("#profileToggle").click();
    await expect(
      page.getByRole("heading", { name: /^profile$|^profilo$/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /back|indietro/i }).click();
    await expect(page.locator("select").first()).toBeVisible();
  });

  test("Live mode no longer asks for an OpenAI API key", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("advancedMode", "true");
      localStorage.setItem("mainAccessToken", "e2e-token");
    });
    await page.goto("/");
    // Even if a stale key was set, it must not gate the Live mode UI anymore.
    await page.evaluate(() =>
      localStorage.setItem("openai_api_key", "sk-stale"),
    );
    await page.locator("#scriptLibrary").selectOption("finale-di-partita");
    const characterSelect = page.locator("#characterSelect");
    await expect(characterSelect).toBeVisible();
    await characterSelect
      .selectOption({ label: "CLOV" })
      .catch(async () => characterSelect.selectOption({ index: 1 }));
    await page.locator("#memorizationButton").click();
    const startPractice = page
      .getByRole("button", { name: /start practice|inizia/i })
      .first();
    if (await startPractice.isVisible().catch(() => false)) {
      await startPractice.click();
    }
    const apiKeyInput = page.locator(
      'input[type="password"], input[name="apiKey"], input[placeholder*="sk-"]',
    );
    await expect(apiKeyInput).toHaveCount(0);
    await expect(page.getByTestId("copy-debug-report-btn")).toBeVisible();
  });
});

test.describe("Memorize Tool — backend smoke", () => {
  const accessToken = process.env.PLAYWRIGHT_ACCESS_TOKEN;

  const expectStatus = async (
    resPromise: Promise<APIResponse>,
    status: number,
  ) => {
    const res = await resPromise;
    expect(res.status(), `expected ${status} for ${res.url()}`).toBe(status);
    return res;
  };

  test("public endpoints respond with the expected payloads", async ({
    request,
  }) => {
    const health = await expectStatus(request.get("/api/healthz"), 200);
    expect(await health.json()).toMatchObject({ status: expect.any(String) });

    const list = await expectStatus(request.get("/api/scripts"), 200);
    const listBody = (await list.json()) as { scripts: { id: string }[] };
    expect(Array.isArray(listBody.scripts)).toBe(true);
    expect(listBody.scripts.length).toBeGreaterThanOrEqual(12);
    expect(
      listBody.scripts.some((script) => script.id === "finale-di-partita"),
    ).toBe(true);

    const detail = await expectStatus(
      request.get("/api/scripts/finale-di-partita"),
      200,
    );
    const detailBody = (await detail.json()) as {
      meta: unknown;
      content: { lines: unknown[] };
    };
    expect(detailBody.meta).toBeTruthy();
    expect(Array.isArray(detailBody.content.lines)).toBe(true);

    await expectStatus(request.get("/api/scripts/no-such-script"), 404);
    if (accessToken) {
      await expectStatus(
        request.get("/api/tts/health", {
          headers: { "x-access-token": accessToken },
        }),
        200,
      );
    } else {
      await expectStatus(request.get("/api/tts/health"), 401);
    }
  });

  test("auth-protected endpoints reject unauthenticated and invalid tokens", async ({
    request,
  }) => {
    await expectStatus(request.get("/api/user/me"), 401);
    await expectStatus(
      request.get("/api/user/me", {
        headers: { Authorization: "Bearer not.a.real.jwt" },
      }),
      401,
    );
    await expectStatus(
      request.get("/api/passkey/count", {
        headers: { Authorization: "Bearer not.a.real.jwt" },
      }),
      401,
    );
    await expectStatus(request.get("/api/passkey/count"), 401);
  });

  test("logout is idempotent for invalid tokens and rejects missing header", async ({
    request,
  }) => {
    await expectStatus(
      request.post("/api/user/logout", {
        headers: { Authorization: "Bearer not.a.real.jwt" },
      }),
      200,
    );
    await expectStatus(request.post("/api/user/logout"), 400);
  });
});
