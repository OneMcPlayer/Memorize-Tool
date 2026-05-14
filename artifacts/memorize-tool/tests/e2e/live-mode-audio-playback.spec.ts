import { expect, test } from "@playwright/test";
import { seedAppStorage } from "./helpers/storage";

function silentWav(durationMs = 240, sampleRate = 8000): Buffer {
  const samples = Math.max(1, Math.round((durationMs / 1000) * sampleRate));
  const dataBytes = samples * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataBytes, 40);
  return buffer;
}

test.describe("Live mode audio playback", () => {
  test("plays mocked TTS audio and advances to the user's turn", async ({
    page,
  }) => {
    await seedAppStorage(page, { advancedMode: "true" });

    await page.route("**/api/tts/speech", async (route) => {
      await route.fulfill({
        body: silentWav(),
        contentType: "audio/wav",
        headers: {
          "Cache-Control": "no-store",
          "X-TTS-Cache-Status": "MISS",
        },
      });
    });

    await page.goto("./");
    await page.locator("#scriptLibrary").selectOption("finale-di-partita");
    const characterSelect = page.locator("#characterSelect");
    await expect(characterSelect).toBeVisible();
    await characterSelect
      .selectOption({ label: "HAMM" })
      .catch(async () => characterSelect.selectOption({ index: 1 }));
    await page.locator("#memorizationButton").click();

    const startPractice = page
      .getByRole("button", { name: /start practice|inizia/i })
      .first();
    if (await startPractice.isVisible().catch(() => false)) {
      await startPractice.click();
    }

    await page.getByTestId("play-next-btn").click();
    await expect(page.getByTestId("record-btn")).toBeEnabled({
      timeout: 15_000,
    });
    await expect(page.getByTestId("play-next-btn")).not.toHaveText(/Playing/i);
  });

  test("reveal mode shows the user's line without calling STT", async ({
    page,
  }) => {
    let sttRequests = 0;

    await seedAppStorage(page, { advancedMode: "true" });

    await page.route("**/api/tts/speech", async (route) => {
      await route.fulfill({
        body: silentWav(),
        contentType: "audio/wav",
        headers: {
          "Cache-Control": "no-store",
          "X-TTS-Cache-Status": "MISS",
        },
      });
    });

    await page.route("**/api/audio/transcriptions", async (route) => {
      sttRequests += 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ text: "should not be used" }),
      });
    });

    await page.goto("./");
    await page.locator("#scriptLibrary").selectOption("finale-di-partita");
    const characterSelect = page.locator("#characterSelect");
    await expect(characterSelect).toBeVisible();
    await characterSelect
      .selectOption({ label: "HAMM" })
      .catch(async () => characterSelect.selectOption({ index: 1 }));
    await page.locator("#memorizationButton").click();

    const startPractice = page
      .getByRole("button", { name: /start practice|inizia/i })
      .first();
    if (await startPractice.isVisible().catch(() => false)) {
      await startPractice.click();
    }

    await page.getByTestId("reveal-mode-toggle-input").check({ force: true });
    await expect(page.getByTestId("record-btn")).toHaveCount(0);

    await page.getByTestId("play-next-btn").click();
    await expect(page.getByTestId("reveal-line-btn")).toBeEnabled({
      timeout: 15_000,
    });

    await page.getByTestId("reveal-line-btn").click();
    await expect(page.getByTestId("revealed-user-line")).toBeVisible();
    await expect(page.getByTestId("reveal-continue-btn")).toBeEnabled();

    await page.getByTestId("reveal-continue-btn").click();
    await expect(page.getByTestId("revealed-user-line")).toHaveCount(0);
    await expect(page.getByTestId("play-next-btn")).toBeEnabled();
    expect(sttRequests).toBe(0);
  });

  test("car mode automatically plays the revealed user line without STT", async ({
    page,
  }) => {
    let sttRequests = 0;
    const spokenTtsRequests: string[] = [];

    await seedAppStorage(page, {
      advancedMode: "true",
      carModeEnabled: "true",
    });

    await page.route("**/api/tts/speech", async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        cacheOnly?: boolean;
        text?: string;
      };
      if (body.cacheOnly) {
        await route.fulfill({ status: 204 });
        return;
      }
      spokenTtsRequests.push(body.text ?? "");
      await route.fulfill({
        body: silentWav(900),
        contentType: "audio/wav",
        headers: {
          "Cache-Control": "no-store",
          "X-TTS-Cache-Status": "MISS",
        },
      });
    });

    await page.route("**/api/audio/transcriptions", async (route) => {
      sttRequests += 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ text: "should not be used" }),
      });
    });

    await page.goto("./");
    await page.locator("#scriptLibrary").selectOption("finale-di-partita");
    const characterSelect = page.locator("#characterSelect");
    await expect(characterSelect).toBeVisible();
    await characterSelect
      .selectOption({ label: "HAMM" })
      .catch(async () => characterSelect.selectOption({ index: 1 }));
    await page.locator("#memorizationButton").click();

    const startPractice = page
      .getByRole("button", { name: /start practice|inizia/i })
      .first();
    if (await startPractice.isVisible().catch(() => false)) {
      await startPractice.click();
    }

    await page.getByTestId("reveal-mode-toggle-input").check({ force: true });
    await expect(page.getByTestId("reveal-line-btn")).toHaveCount(0);
    await expect(page.getByTestId("car-mode-stop-btn")).toBeDisabled();

    await page.getByTestId("play-next-btn").click();
    await expect(page.getByTestId("car-mode-stop-btn")).toBeEnabled();
    await expect(page.getByTestId("car-mode-status")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("revealed-user-line")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("revealed-user-line")).toHaveCount(0, {
      timeout: 15_000,
    });

    expect(sttRequests).toBe(0);
    expect(spokenTtsRequests.length).toBeGreaterThanOrEqual(2);
  });

  test("keeps the cue tag editor open when the backdrop is clicked", async ({
    page,
  }) => {
    await seedAppStorage(page, {
      advancedMode: "true",
      authToken: "e2e-auth-token",
      authTokenExpires: String(Date.now() + 60 * 60 * 1000),
      authUser: JSON.stringify({ username: "Alle", isAuthenticated: true }),
    });

    await page.route("**/api/access/verify", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route("**/api/user/me", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ username: "Alle", isAuthenticated: true }),
      });
    });

    await page.route("**/api/user/line-tags**", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          maxLength: 2000,
          scriptKey: "id:finale-di-partita",
          tags: {},
          version: 2,
        }),
      });
    });

    await page.goto("./");
    await page.locator("#scriptLibrary").selectOption("finale-di-partita");
    const characterSelect = page.locator("#characterSelect");
    await expect(characterSelect).toBeVisible();
    await characterSelect
      .selectOption({ label: "HAMM" })
      .catch(async () => characterSelect.selectOption({ index: 1 }));
    await page.locator("#memorizationButton").click();

    const startPractice = page
      .getByRole("button", { name: /start practice|inizia/i })
      .first();
    if (await startPractice.isVisible().catch(() => false)) {
      await startPractice.click();
    }

    await page.getByTestId("open-line-tags-btn").click();
    const modal = page.getByTestId("line-tags-modal");
    await expect(modal).toBeVisible();
    const firstInput = page.locator("[data-testid^='line-tags-input-']").first();
    await firstInput.fill("[letteralmente] prova");

    await page.mouse.click(20, 20);

    await expect(modal).toBeVisible();
    await expect(firstInput).toHaveValue("[letteralmente] prova");
  });

  test("shows gender tags in the voice assignment picker", async ({ page }) => {
    await seedAppStorage(page, { advancedMode: "true" });

    await page.goto("./");
    await page.locator("#scriptLibrary").selectOption("finale-di-partita");
    const characterSelect = page.locator("#characterSelect");
    await expect(characterSelect).toBeVisible();
    await characterSelect
      .selectOption({ label: "HAMM" })
      .catch(async () => characterSelect.selectOption({ index: 1 }));
    await page.locator("#memorizationButton").click();

    const startPractice = page
      .getByRole("button", { name: /start practice|inizia/i })
      .first();
    if (await startPractice.isVisible().catch(() => false)) {
      await startPractice.click();
    }

    await page.getByTestId("open-voice-assign-btn").click();
    await expect(page.getByTestId("voice-assignment-modal")).toBeVisible();

    const firstVoiceSelect = page.locator(".voice-select").first();
    const optionLabels = await firstVoiceSelect.locator("option").allTextContents();

    expect(optionLabels).toContain("Default (Zephyr) [female]");
    expect(optionLabels).toContain("Puck [male] — upbeat");
    expect(optionLabels).toContain("Kore [female] — firm");
  });

  test("keeps a wrong spoken line available for retry until continue", async ({
    page,
  }) => {
    await seedAppStorage(page, { advancedMode: "true" });

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => {
            let readyState = "live";
            const track = {
              enabled: true,
              kind: "audio",
              muted: false,
              get readyState() {
                return readyState;
              },
              stop: () => {
                readyState = "ended";
              },
            };
            return {
              getAudioTracks: () => [track],
              getTracks: () => [track],
            };
          },
        },
      });

      class MockMediaRecorder {
        static isTypeSupported() {
          return true;
        }

        mimeType: string;
        state = "inactive";
        ondataavailable: ((event: { data: Blob }) => void) | null = null;
        onerror: ((event: Event & { error?: Error }) => void) | null = null;
        onstart: (() => void) | null = null;
        onstop: (() => void) | null = null;

        constructor(_stream: unknown, options?: { mimeType?: string }) {
          this.mimeType = options?.mimeType ?? "audio/webm;codecs=opus";
        }

        start() {
          this.state = "recording";
          window.setTimeout(() => this.onstart?.(), 0);
        }

        requestData() {
          this.ondataavailable?.({
            data: new Blob([new Uint8Array(4096).fill(7)], {
              type: this.mimeType,
            }),
          });
        }

        stop() {
          this.state = "inactive";
          window.setTimeout(() => this.onstop?.(), 0);
        }
      }

      Object.defineProperty(window, "MediaRecorder", {
        configurable: true,
        value: MockMediaRecorder,
      });
    });

    await page.route("**/api/tts/speech", async (route) => {
      await route.fulfill({
        body: silentWav(),
        contentType: "audio/wav",
        headers: {
          "Cache-Control": "no-store",
          "X-TTS-Cache-Status": "MISS",
        },
      });
    });

    await page.route("**/api/audio/transcriptions", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ text: "wrong words" }),
      });
    });

    await page.goto("./");
    await page.locator("#scriptLibrary").selectOption("finale-di-partita");
    const characterSelect = page.locator("#characterSelect");
    await expect(characterSelect).toBeVisible();
    await characterSelect
      .selectOption({ label: "HAMM" })
      .catch(async () => characterSelect.selectOption({ index: 1 }));
    await page.locator("#memorizationButton").click();

    const startPractice = page
      .getByRole("button", { name: /start practice|inizia/i })
      .first();
    if (await startPractice.isVisible().catch(() => false)) {
      await startPractice.click();
    }

    await page.getByTestId("play-next-btn").click();
    await expect(page.getByTestId("record-btn")).toBeEnabled({
      timeout: 15_000,
    });

    await page.getByTestId("record-btn").click();
    await expect(page.getByTestId("record-btn")).toHaveText(/stop|ferma/i);
    await page.waitForTimeout(350);
    await page.getByTestId("record-btn").click();

    await expect(page.getByTestId("line-retry-actions")).toBeVisible();
    await expect(page.getByTestId("record-btn")).toHaveText(
      /try again|riprova/i,
    );

    await page.getByTestId("line-retry-btn").click();
    await expect(page.getByTestId("record-btn")).toHaveText(/stop|ferma/i);
    await page.waitForTimeout(350);
    await page.getByTestId("record-btn").click();
    await expect(page.getByTestId("line-retry-actions")).toBeVisible();

    await page.getByTestId("line-continue-btn").click();
    await expect(page.getByTestId("line-retry-actions")).toHaveCount(0);
    await expect(page.getByTestId("play-next-btn")).toBeEnabled();
  });
});
