export interface GeminiVoice {
  gender: "female" | "male";
  id: string;
  hint: string;
}

export interface VoiceProfile {
  gender: "female" | "male";
  id: string;
  tone: string;
}

export const GEMINI_VOICES: GeminiVoice[] = [
  { id: "Zephyr", gender: "female", hint: "bright" },
  { id: "Puck", gender: "male", hint: "upbeat" },
  { id: "Charon", gender: "male", hint: "informative" },
  { id: "Kore", gender: "female", hint: "firm" },
  { id: "Fenrir", gender: "male", hint: "excitable" },
  { id: "Leda", gender: "female", hint: "youthful" },
  { id: "Orus", gender: "male", hint: "firm" },
  { id: "Aoede", gender: "female", hint: "breezy" },
  { id: "Callirrhoe", gender: "female", hint: "easy-going" },
  { id: "Autonoe", gender: "female", hint: "bright" },
  { id: "Enceladus", gender: "male", hint: "breathy" },
  { id: "Iapetus", gender: "male", hint: "clear" },
  { id: "Umbriel", gender: "male", hint: "easy-going" },
  { id: "Algieba", gender: "male", hint: "smooth" },
  { id: "Despina", gender: "female", hint: "smooth" },
  { id: "Erinome", gender: "female", hint: "clear" },
  { id: "Algenib", gender: "male", hint: "gravelly" },
  { id: "Rasalgethi", gender: "male", hint: "informative" },
  { id: "Laomedeia", gender: "female", hint: "upbeat" },
  { id: "Achernar", gender: "female", hint: "soft" },
  { id: "Alnilam", gender: "male", hint: "firm" },
  { id: "Schedar", gender: "male", hint: "even" },
  { id: "Gacrux", gender: "female", hint: "mature" },
  { id: "Pulcherrima", gender: "female", hint: "forward" },
  { id: "Achird", gender: "male", hint: "friendly" },
  { id: "Zubenelgenubi", gender: "male", hint: "casual" },
  { id: "Vindemiatrix", gender: "female", hint: "gentle" },
  { id: "Sadachbia", gender: "male", hint: "lively" },
  { id: "Sadaltager", gender: "male", hint: "knowledgeable" },
  { id: "Sulafat", gender: "female", hint: "warm" },
];

export const DEFAULT_VOICE_ID = "Zephyr";
export const DEFAULT_GEMINI_VOICE = GEMINI_VOICES.find(
  (voice) => voice.id === DEFAULT_VOICE_ID,
) ?? GEMINI_VOICES[0];

export const VOICE_PROFILES: VoiceProfile[] = [
  { id: "voice-01", gender: "female", tone: "bright" },
  { id: "voice-02", gender: "male", tone: "upbeat" },
  { id: "voice-03", gender: "male", tone: "informative" },
  { id: "voice-04", gender: "female", tone: "firm" },
  { id: "voice-05", gender: "male", tone: "excitable" },
  { id: "voice-06", gender: "female", tone: "youthful" },
  { id: "voice-07", gender: "male", tone: "firm" },
  { id: "voice-08", gender: "female", tone: "breezy" },
  { id: "voice-09", gender: "female", tone: "easy-going" },
  { id: "voice-10", gender: "female", tone: "bright" },
  { id: "voice-11", gender: "male", tone: "breathy" },
  { id: "voice-12", gender: "male", tone: "clear" },
  { id: "voice-13", gender: "male", tone: "easy-going" },
  { id: "voice-14", gender: "male", tone: "smooth" },
  { id: "voice-15", gender: "female", tone: "smooth" },
  { id: "voice-16", gender: "female", tone: "clear" },
  { id: "voice-17", gender: "male", tone: "gravelly" },
  { id: "voice-18", gender: "male", tone: "informative" },
  { id: "voice-19", gender: "female", tone: "upbeat" },
  { id: "voice-20", gender: "female", tone: "soft" },
  { id: "voice-21", gender: "male", tone: "firm" },
  { id: "voice-22", gender: "male", tone: "even" },
  { id: "voice-23", gender: "female", tone: "mature" },
  { id: "voice-24", gender: "female", tone: "forward" },
  { id: "voice-25", gender: "male", tone: "friendly" },
  { id: "voice-26", gender: "male", tone: "casual" },
  { id: "voice-27", gender: "female", tone: "gentle" },
  { id: "voice-28", gender: "male", tone: "lively" },
  { id: "voice-29", gender: "male", tone: "knowledgeable" },
  { id: "voice-30", gender: "female", tone: "warm" },
];

const GEMINI_PROFILE_VOICE_IDS: Record<string, string> = {
  "voice-01": "Zephyr",
  "voice-02": "Puck",
  "voice-03": "Charon",
  "voice-04": "Kore",
  "voice-05": "Fenrir",
  "voice-06": "Leda",
  "voice-07": "Orus",
  "voice-08": "Aoede",
  "voice-09": "Callirrhoe",
  "voice-10": "Autonoe",
  "voice-11": "Enceladus",
  "voice-12": "Iapetus",
  "voice-13": "Umbriel",
  "voice-14": "Algieba",
  "voice-15": "Despina",
  "voice-16": "Erinome",
  "voice-17": "Algenib",
  "voice-18": "Rasalgethi",
  "voice-19": "Laomedeia",
  "voice-20": "Achernar",
  "voice-21": "Alnilam",
  "voice-22": "Schedar",
  "voice-23": "Gacrux",
  "voice-24": "Pulcherrima",
  "voice-25": "Achird",
  "voice-26": "Zubenelgenubi",
  "voice-27": "Vindemiatrix",
  "voice-28": "Sadachbia",
  "voice-29": "Sadaltager",
  "voice-30": "Sulafat",
};

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function profileAt(index: number): VoiceProfile {
  return VOICE_PROFILES[index % VOICE_PROFILES.length] ?? VOICE_PROFILES[0];
}

export function buildAutoVoiceProfileAssignments(
  characters: string[],
  scriptKey: string,
): Record<string, string> {
  const assigned: Record<string, string> = {};
  const used = new Set<string>();
  const seen = new Set<string>();

  for (const character of characters) {
    const normalized = character.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    const start = stableHash(`${scriptKey}\u0001${normalized}`) % VOICE_PROFILES.length;
    let selected = profileAt(start);
    for (let offset = 0; offset < VOICE_PROFILES.length; offset += 1) {
      const candidate = profileAt(start + offset);
      if (!used.has(candidate.id)) {
        selected = candidate;
        break;
      }
    }

    assigned[character] = selected.id;
    used.add(selected.id);
  }

  return assigned;
}

export function resolveVoiceProfile(
  profileId: string | undefined,
  provider: "gemini" = "gemini",
): { profile: VoiceProfile; voiceId: string } {
  const profile =
    VOICE_PROFILES.find((item) => item.id === profileId) ?? VOICE_PROFILES[0];

  if (provider === "gemini") {
    const voiceId = GEMINI_PROFILE_VOICE_IDS[profile.id] ?? DEFAULT_VOICE_ID;
    return { profile, voiceId };
  }

  return { profile, voiceId: DEFAULT_VOICE_ID };
}

const MIN_SAMPLE_LEN = 25;
const IDEAL_MIN = 60;
const IDEAL_MAX = 180;
const HARD_CAP = 220;
const MAX_CANDIDATES = 6;

function trimSample(line: string): string {
  if (line.length <= HARD_CAP) return line;
  return `${line.slice(0, HARD_CAP - 3).trimEnd()}...`;
}

/**
 * Return up to MAX_CANDIDATES distinct sample lines for a character,
 * ordered from "best representative" to "fallback". The list is
 * deterministic (no Math.random) so each candidate maps to a stable
 * TTS cache key — cycling through them never re-generates audio for
 * the same (line, voice) pair more than once.
 *
 * Heuristic:
 *  - Prefer lines in the ideal length window [IDEAL_MIN, IDEAL_MAX]
 *    (short enough for a quick preview, long enough to hear the voice).
 *  - Then anything >= MIN_SAMPLE_LEN, sorted by closeness to the
 *    middle of the ideal window.
 *  - Then anything else, longest first (truncated to HARD_CAP).
 *  - Spread picks across the script (start / middle / end) to surface
 *    different deliveries instead of N consecutive lines.
 */
export function pickSampleLinesForCharacter(
  scriptText: string,
  character: string,
): string[] {
  if (!scriptText || !character) return [];
  const target = character.toUpperCase();
  const lines = scriptText.split("\n");
  const all: string[] = [];
  for (const raw of lines) {
    const match = raw.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
    if (!match) continue;
    const speaker = match[1].trim().toUpperCase();
    const dialogue = match[2].trim();
    if (speaker !== target) continue;
    if (!dialogue) continue;
    // Strip TTS style cue tags like [shouting] for the preview text shown,
    // but keep them in the actual TTS payload — so we DON'T strip from the
    // returned string. The Gemini model uses them to color the delivery.
    all.push(dialogue);
  }
  if (all.length === 0) return [];

  const idealMid = (IDEAL_MIN + IDEAL_MAX) / 2;
  const ideal = all.filter((l) => l.length >= IDEAL_MIN && l.length <= IDEAL_MAX);
  const ok = all.filter((l) => l.length >= MIN_SAMPLE_LEN && !ideal.includes(l));
  const rest = all.filter((l) => l.length < MIN_SAMPLE_LEN);

  // Sort ideal by proximity to the mid-length and spread across the script
  // by walking the original-order indices in stride.
  const indexOf = new Map<string, number>();
  all.forEach((l, i) => {
    if (!indexOf.has(l)) indexOf.set(l, i);
  });

  const idealSorted = [...ideal].sort((a, b) => {
    const da = Math.abs(a.length - idealMid);
    const db = Math.abs(b.length - idealMid);
    if (da !== db) return da - db;
    return (indexOf.get(a) ?? 0) - (indexOf.get(b) ?? 0);
  });
  const okSorted = [...ok].sort((a, b) => {
    const da = Math.abs(a.length - idealMid);
    const db = Math.abs(b.length - idealMid);
    return da - db;
  });
  const restSorted = [...rest].sort((a, b) => b.length - a.length);

  const merged: string[] = [];
  const seen = new Set<string>();
  for (const list of [idealSorted, okSorted, restSorted]) {
    for (const l of list) {
      if (seen.has(l)) continue;
      seen.add(l);
      merged.push(l);
      if (merged.length >= MAX_CANDIDATES) break;
    }
    if (merged.length >= MAX_CANDIDATES) break;
  }

  return merged.map(trimSample);
}

/** Convenience: first/best candidate or null. */
export function pickSampleLineForCharacter(
  scriptText: string,
  character: string,
): string | null {
  return pickSampleLinesForCharacter(scriptText, character)[0] ?? null;
}

/**
 * Return every dialogue line spoken by a character in script order, using
 * the same parser as `pickSampleLinesForCharacter` and `buildSequence`.
 * No dedupe, no length filtering — useful when the caller wants to pick a
 * random line for an audition preview.
 */
export function getAllLinesForCharacter(
  scriptText: string,
  character: string,
): string[] {
  if (!scriptText || !character) return [];
  const target = character.toUpperCase();
  const lines = scriptText.split("\n");
  const out: string[] = [];
  for (const raw of lines) {
    const match = raw.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
    if (!match) continue;
    const speaker = match[1].trim().toUpperCase();
    const dialogue = match[2].trim();
    if (speaker !== target) continue;
    if (!dialogue) continue;
    out.push(trimSample(dialogue));
  }
  return out;
}

/** Pick a random index for a list of length `total`, avoiding `avoid` if possible. */
export function pickRandomLineIndex(total: number, avoid?: number): number {
  if (total <= 0) return 0;
  if (total === 1) return 0;
  let idx = Math.floor(Math.random() * total);
  if (typeof avoid === "number" && avoid >= 0 && avoid < total && total > 1) {
    let guard = 0;
    while (idx === avoid && guard < 5) {
      idx = Math.floor(Math.random() * total);
      guard += 1;
    }
  }
  return idx;
}
