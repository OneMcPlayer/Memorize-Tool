import { expect, test } from "@playwright/test";

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
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("advancedMode", "true");
      localStorage.setItem("mainAccessToken", "e2e-token");
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

    await page.goto("/");
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
});
