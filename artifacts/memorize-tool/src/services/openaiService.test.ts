import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import openaiService, {
  MIN_STT_UPLOAD_BYTES,
  MIN_TTS_AUDIO_BYTES,
} from "./openaiService";

function resetPlaybackAudio(): void {
  openaiService.stopAudio();
  const service = openaiService as unknown as {
    currentAudio: HTMLAudioElement | null;
    currentAudioUrl: string | null;
    currentPlaybackCancel: ((reason: string) => void) | null;
  };
  service.currentAudio = null;
  service.currentAudioUrl = null;
  service.currentPlaybackCancel = null;
}

describe("openaiService speechToText", () => {
  beforeEach(() => {
    resetPlaybackAudio();
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetPlaybackAudio();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects tiny captures before calling the backend", async () => {
    const tinyCapture = new Blob([new Uint8Array(MIN_STT_UPLOAD_BYTES - 1)], {
      type: "audio/webm",
    });

    await expect(openaiService.speechToText(tinyCapture)).rejects.toThrow(
      /Audio data is too short/,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects tiny TTS responses before playback can try to decode them", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Uint8Array(MIN_TTS_AUDIO_BYTES - 1), {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      }),
    );

    await expect(openaiService.textToSpeech("hello")).rejects.toThrow(
      /empty or invalid audio/,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reuses one audio element for primed sequential TTS playback", async () => {
    const createdAudio: MockAudio[] = [];
    const createObjectURL = vi.fn(
      (blob: Blob) => `blob:${blob.size}:${createdAudio.length}`,
    );
    const revokeObjectURL = vi.fn();

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    class MockAudio {
      currentTime = 0;
      muted = false;
      onended: (() => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      preload = "";
      src = "";
      volume = 1;
      load = vi.fn();
      pause = vi.fn();
      removeAttribute = vi.fn((name: string) => {
        if (name === "src") this.src = "";
      });
      setAttribute = vi.fn();
      play = vi.fn(() => {
        queueMicrotask(() => this.onended?.());
        return Promise.resolve();
      });
      constructor() {
        createdAudio.push(this);
      }
    }

    vi.stubGlobal("Audio", MockAudio);

    await expect(openaiService.primeAudioPlayback()).resolves.toBe(true);
    await openaiService.playAudio(new Blob(["first"], { type: "audio/wav" }));
    await openaiService.playAudio(new Blob(["second"], { type: "audio/wav" }));

    expect(createdAudio).toHaveLength(1);
    expect(createdAudio[0].play).toHaveBeenCalledTimes(3);
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("does not hang when audio priming never settles", async () => {
    vi.useFakeTimers();
    const createdAudio: MockAudio[] = [];

    class MockAudio {
      currentTime = 0;
      muted = false;
      onended: (() => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      preload = "";
      src = "";
      volume = 1;
      load = vi.fn();
      pause = vi.fn();
      removeAttribute = vi.fn((name: string) => {
        if (name === "src") this.src = "";
      });
      setAttribute = vi.fn();
      play = vi.fn(() => new Promise<void>(() => {}));
      constructor() {
        createdAudio.push(this);
      }
    }

    vi.stubGlobal("Audio", MockAudio);

    const primed = openaiService.primeAudioPlayback();
    await vi.advanceTimersByTimeAsync(1000);

    await expect(primed).resolves.toBe(false);
    expect(createdAudio).toHaveLength(1);
    expect(createdAudio[0].pause).toHaveBeenCalled();
    expect(createdAudio[0].removeAttribute).toHaveBeenCalledWith("src");
  });

  it("settles active playback when stopped", async () => {
    const createdAudio: MockAudio[] = [];
    const createObjectURL = vi.fn(
      (blob: Blob) => `blob:${blob.size}:${createdAudio.length}`,
    );
    const revokeObjectURL = vi.fn();

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    class MockAudio {
      currentTime = 0;
      duration = 10;
      ended = false;
      muted = false;
      networkState = 1;
      onended: (() => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      paused = false;
      preload = "";
      readyState = 4;
      src = "";
      volume = 1;
      load = vi.fn();
      pause = vi.fn(() => {
        this.paused = true;
      });
      removeAttribute = vi.fn((name: string) => {
        if (name === "src") this.src = "";
      });
      setAttribute = vi.fn();
      play = vi.fn(() => Promise.resolve());
      constructor() {
        createdAudio.push(this);
      }
    }

    vi.stubGlobal("Audio", MockAudio);

    const playback = openaiService.playAudio(
      new Blob(["playing"], { type: "audio/wav" }),
    );
    openaiService.stopAudio("test stop");

    await expect(playback).rejects.toThrow("test stop");
    if (createdAudio[0]) {
      expect(createdAudio[0].pause).toHaveBeenCalled();
    }
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
