import { expect, test } from "@playwright/test";

test.describe("STT performance test page", () => {
  test("uploads one sample and renders mocked Whisper/Gemini timings", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("advancedMode", "true");
      localStorage.setItem("mainAccessToken", "e2e-token");
    });

    await page.route("**/api/audio/stt-performance", async (route) => {
      const body = (route.request().postDataBuffer() ?? Buffer.alloc(0)).toString(
        "latin1",
      );
      const isWhisper = body.includes("whisper-large-v3");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          target: isWhisper ? "whisper-large-v3" : "gemini-3.1-flash",
          model: isWhisper
            ? "openai/whisper-large-v3"
            : "google/gemini-3.1-flash-lite-preview",
          endpoint: isWhisper
            ? "openrouter-audio-transcriptions"
            : "openrouter-chat-audio-input",
          text: isWhisper
            ? "Whisper heard the sample line clearly."
            : "Gemini heard the sample line clearly.",
          usage: isWhisper
            ? { seconds: 1.2, cost: 0.001 }
            : { total_tokens: 86 },
          generationId: isWhisper ? "gen-whisper-e2e" : "gen-gemini-e2e",
          durationMs: isWhisper ? 940 : 620,
          input: {
            format: "wav",
            mimeType: "audio/wav",
            sizeBytes: 4096,
          },
        }),
      });
    });

    await page.goto("/");
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
    await expect(page.getByText("Gemini heard the sample line")).toBeVisible();
    await expect(page.getByText(/Gemini 3\.1 Flash was faster/)).toBeVisible();
  });
});
