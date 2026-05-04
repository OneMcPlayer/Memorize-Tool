import { describe, it, expect, beforeEach, vi } from "vitest";

// Ensure the module's constructor sees a clean window without
// SpeechSynthesis (jsdom doesn't ship it) and skips Web Speech init.
let ttsService: typeof import("./ttsService").default;

beforeEach(async () => {
  vi.resetModules();
  ttsService = (await import("./ttsService")).default;
  ttsService.isTestMode = true;
});

describe("ttsService", () => {
  it("isAvailable reflects Google TTS or Web Speech availability", () => {
    expect(ttsService.isAvailable()).toBe(true);
    ttsService.updateConfig({ useGoogleTTS: false });
    // Web Speech is not available in jsdom either, so we expect false now.
    expect(ttsService.isAvailable()).toBe(false);
  });

  it("speak() in test mode resolves and records the spoken text", async () => {
    ttsService.isTestMode = true;
    const promise = ttsService.speak("ciao mondo", { lang: "it-IT" });
    await promise;
    expect(ttsService.lastSpokenText).toBe("ciao mondo");
    expect(ttsService.lastSpokenOptions).toMatchObject({ lang: "it-IT" });
    expect(ttsService.speakCalled).toBe(true);
    expect(ttsService.isCurrentlySpeaking()).toBe(false);
  });

  it("speak() with empty text resolves immediately without firing speakCalled", async () => {
    ttsService.speakCalled = false;
    await ttsService.speak("");
    expect(ttsService.speakCalled).toBe(false);
  });

  it("stop() in test mode dispatches a stop event and resets speaking state", () => {
    const handler = vi.fn();
    document.addEventListener("tts-stop-called", handler);
    ttsService.isTestMode = true;
    ttsService.isSpeaking = true;
    ttsService.stop();
    expect(ttsService.isCurrentlySpeaking()).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    document.removeEventListener("tts-stop-called", handler);
  });

  it("updateConfig merges new values without losing defaults", () => {
    ttsService.updateConfig({ defaultRate: 1.5 });
    expect(ttsService.config.defaultRate).toBe(1.5);
    expect(ttsService.config.defaultVolume).toBe(1.0);
  });
});
