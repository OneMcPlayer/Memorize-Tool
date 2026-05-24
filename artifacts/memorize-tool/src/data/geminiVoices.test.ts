import { describe, expect, it } from "vitest";
import {
  buildAutoVoiceProfileAssignments,
  GEMINI_VOICES,
  resolveVoiceProfile,
} from "./geminiVoices";

describe("auto voice profiles", () => {
  it("assigns stable per-script profile ids", () => {
    const characters = ["HAMM", "CLOV", "NELL"];

    const first = buildAutoVoiceProfileAssignments(
      characters,
      "id:finale-di-partita",
    );
    const second = buildAutoVoiceProfileAssignments(
      characters,
      "id:finale-di-partita",
    );

    expect(second).toEqual(first);
    expect(Object.values(first).every((id) => id.startsWith("voice-"))).toBe(
      true,
    );
    expect(new Set(Object.values(first)).size).toBe(characters.length);
  });

  it("resolves profiles to the current Gemini provider map", () => {
    const assignments = buildAutoVoiceProfileAssignments(
      ["HAMM"],
      "id:finale-di-partita",
    );
    const resolved = resolveVoiceProfile(assignments.HAMM, "gemini");

    expect(resolved.profile.id).toBe(assignments.HAMM);
    expect(GEMINI_VOICES.map((voice) => voice.id)).toContain(resolved.voiceId);
  });
});
