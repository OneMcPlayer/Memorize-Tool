import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useMicrophoneRecorder from "./useMicrophoneRecorder";

interface FakeRecorder {
  state: "inactive" | "recording";
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: ((e: Event & { error?: Error }) => void) | null;
  onstart: (() => void) | null;
  requestData: () => void;
  start: (timeslice?: number) => void;
  stop: () => void;
}

function installFakeMediaRecorder(): {
  recorder: FakeRecorder | null;
} {
  const ref: { recorder: FakeRecorder | null } = { recorder: null };

  class MockMediaRecorder implements FakeRecorder {
    state: "inactive" | "recording" = "inactive";
    mimeType = "audio/webm";
    ondataavailable: FakeRecorder["ondataavailable"] = null;
    onstop: FakeRecorder["onstop"] = null;
    onerror: FakeRecorder["onerror"] = null;
    onstart: FakeRecorder["onstart"] = null;
    constructor() {
      ref.recorder = this;
    }
    requestData() {
      this.ondataavailable?.({ data: new Blob(["chunk"], { type: this.mimeType }) });
    }
    start() {
      this.state = "recording";
      this.onstart?.();
      this.requestData();
    }
    stop() {
      this.state = "inactive";
      this.onstop?.();
    }
  }
  (MockMediaRecorder as unknown as { isTypeSupported: (t: string) => boolean }).isTypeSupported =
    (t: string) => t === "audio/webm;codecs=opus";

  vi.stubGlobal("MediaRecorder", MockMediaRecorder);
  return ref;
}

function installGetUserMedia(impl: () => Promise<MediaStream>) {
  const fakeTrack = {
    enabled: true,
    kind: "audio",
    muted: false,
    readyState: "live",
    stop: vi.fn(),
  };
  const fakeStream = {
    getAudioTracks: () => [fakeTrack],
    getTracks: () => [fakeTrack],
  } as unknown as MediaStream;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(impl ?? (async () => fakeStream)) },
  });
  return { fakeStream, fakeTrack };
}

describe("useMicrophoneRecorder", () => {
  beforeEach(() => {
    installFakeMediaRecorder();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error - resetting jsdom-injected property between tests
    delete (navigator as unknown as { mediaDevices?: unknown }).mediaDevices;
  });

  it("reports support when both APIs are present", () => {
    installGetUserMedia(async () => ({ getTracks: () => [] }) as unknown as MediaStream);
    const { result } = renderHook(() => useMicrophoneRecorder());
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isRecording).toBe(false);
  });

  it("requestPermission flips hasPermission on success", async () => {
    installGetUserMedia(
      async () =>
        ({
          getAudioTracks: () => [
            {
              enabled: true,
              kind: "audio",
              muted: false,
              readyState: "live",
              stop: vi.fn(),
            },
          ],
          getTracks: () => [
            {
              enabled: true,
              kind: "audio",
              muted: false,
              readyState: "live",
              stop: vi.fn(),
            },
          ],
        }) as unknown as MediaStream,
    );
    const { result } = renderHook(() => useMicrophoneRecorder());
    await act(async () => {
      const ok = await result.current.requestPermission();
      expect(ok).toBe(true);
    });
    expect(result.current.hasPermission).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("requestPermission surfaces a permission-denied error", async () => {
    installGetUserMedia(async () => {
      throw new Error("Permission denied");
    });
    const { result } = renderHook(() => useMicrophoneRecorder());
    await act(async () => {
      const ok = await result.current.requestPermission();
      expect(ok).toBe(false);
    });
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.error).toBe("Permission denied");
  });

  it("startRecording then stopRecording yields a Blob from collected chunks", async () => {
    installGetUserMedia(
      async () =>
        ({
          getAudioTracks: () => [
            {
              enabled: true,
              kind: "audio",
              muted: false,
              readyState: "live",
              stop: vi.fn(),
            },
          ],
          getTracks: () => [
            {
              enabled: true,
              kind: "audio",
              muted: false,
              readyState: "live",
              stop: vi.fn(),
            },
          ],
        }) as unknown as MediaStream,
    );
    const { result } = renderHook(() => useMicrophoneRecorder());

    await act(async () => {
      await result.current.requestPermission();
    });
    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.isRecording).toBe(true);

    let resultValue: Awaited<ReturnType<typeof result.current.stopRecording>> = null;
    await act(async () => {
      resultValue = await result.current.stopRecording();
    });
    expect(resultValue?.blob).toBeInstanceOf(Blob);
    expect(resultValue?.blob.size).toBeGreaterThan(0);
    expect(resultValue?.metadata.bytes).toBeGreaterThan(0);
    expect(resultValue?.metadata.chunkCount).toBeGreaterThan(0);
    expect(result.current.isRecording).toBe(false);
  });

  it("refreshes a stale microphone stream before starting", async () => {
    let firstReadyState: "live" | "ended" = "live";
    const firstTrack = {
      enabled: true,
      kind: "audio",
      muted: false,
      get readyState() {
        return firstReadyState;
      },
      stop: vi.fn(),
    };
    const secondTrack = {
      enabled: true,
      kind: "audio",
      muted: false,
      readyState: "live",
      stop: vi.fn(),
    };
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce({
        getAudioTracks: () => [firstTrack],
        getTracks: () => [firstTrack],
      } as unknown as MediaStream)
      .mockResolvedValueOnce({
        getAudioTracks: () => [secondTrack],
        getTracks: () => [secondTrack],
      } as unknown as MediaStream);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });

    const { result } = renderHook(() => useMicrophoneRecorder());
    await act(async () => {
      await result.current.requestPermission();
    });
    firstReadyState = "ended";
    await act(async () => {
      await result.current.startRecording();
    });

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(firstTrack.stop).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(true);
  });

  it("cleans up the media stream on unmount", async () => {
    const trackStop = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(
          async () =>
            ({ getTracks: () => [{ stop: trackStop }] }) as unknown as MediaStream,
        ),
      },
    });
    const { result, unmount } = renderHook(() => useMicrophoneRecorder());
    await act(async () => {
      await result.current.requestPermission();
    });
    unmount();
    expect(trackStop).toHaveBeenCalled();
  });
});
