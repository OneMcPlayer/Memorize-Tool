import { expect, test } from "@playwright/test";
import { seedAppStorage } from "./helpers/storage";

test.describe("STT performance test page", () => {
  test("uploads one sample and renders mocked Whisper/Chirp timings", async ({
    page,
  }) => {
    await seedAppStorage(page, { advancedMode: "true" });

    await page.route("**/api/audio/stt-performance", async (route) => {
      const body = (route.request().postDataBuffer() ?? Buffer.alloc(0)).toString(
        "latin1",
      );
      const isWhisper = body.includes("whisper-large-v3");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          target: isWhisper ? "whisper-large-v3" : "chirp-3",
          model: isWhisper
            ? "openai/whisper-large-v3"
            : "google/chirp-3",
          endpoint: "openrouter-audio-transcriptions",
          text: isWhisper
            ? "Whisper heard the sample line clearly."
            : "Chirp heard the sample line clearly.",
          usage: isWhisper
            ? { seconds: 1.2, cost: 0.001 }
            : { seconds: 0.7, cost: 0.001 },
          generationId: isWhisper ? "gen-whisper-e2e" : "gen-chirp-e2e",
          durationMs: isWhisper ? 940 : 620,
          input: {
            format: "wav",
            mimeType: "audio/wav",
            sizeBytes: 4096,
          },
        }),
      });
    });

    await page.goto("./");
    await page.locator("#optionsToggle").click();
    await page.getByRole("button", { name: "Experimental options" }).click();
    await page
      .getByRole("button", { name: "STT Performance Test" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Speech-to-Text Performance" }),
    ).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: "sample.wav",
      mimeType: "audio/wav",
      buffer: Buffer.alloc(4096, 1),
    });

    await expect(page.getByRole("heading", { name: "sample.wav" })).toBeVisible();
    await page.getByRole("button", { name: /Run comparison/ }).click();

    await expect(page.getByText("Whisper heard the sample line")).toBeVisible();
    await expect(page.getByText("Chirp heard the sample line")).toBeVisible();
    await expect(page.getByText(/Chirp 3 was faster/)).toBeVisible();
  });
});
