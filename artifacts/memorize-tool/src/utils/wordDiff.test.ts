import { describe, it, expect } from "vitest";
import {
  computeWordDiff,
  evaluateComparableTextMatch,
  hasErrors,
  stripStageDirections,
  tokenizeComparableText,
} from "./wordDiff";

describe("wordDiff", () => {
  describe("stripStageDirections", () => {
    it("removes parenthesized stage directions", () => {
      expect(stripStageDirections("Hello (loudly) world")).toBe("Hello world");
    });
    it("removes nested parentheses", () => {
      expect(stripStageDirections("a (b (c) d) e")).toBe("a e");
    });
    it("collapses whitespace", () => {
      expect(stripStageDirections("a   b  c")).toBe("a b c");
    });
  });

  describe("tokenizeComparableText", () => {
    it("strips punctuation, accents, and case", () => {
      expect(tokenizeComparableText("Ciò è un Test, ok?")).toEqual([
        "cio",
        "e",
        "un",
        "test",
        "ok",
      ]);
    });
    it("keeps apostrophes and normalizes curly quotes", () => {
      expect(tokenizeComparableText("don\u2019t")).toEqual(["don't"]);
    });
    it("returns an empty array on empty input", () => {
      expect(tokenizeComparableText("   ")).toEqual([]);
    });
  });

  describe("computeWordDiff", () => {
    it("returns no diff when both inputs are empty", () => {
      expect(computeWordDiff("", "")).toEqual([]);
    });

    it("marks all words missing when nothing was spoken", () => {
      const diff = computeWordDiff("hello world", "");
      expect(diff).toEqual([
        { word: "hello", status: "missing" },
        { word: "world", status: "missing" },
      ]);
    });

    it("marks all words extra when nothing was expected", () => {
      const diff = computeWordDiff("", "hello world");
      expect(diff).toEqual([
        { word: "hello", status: "extra" },
        { word: "world", status: "extra" },
      ]);
    });

    it("marks identical text as fully correct", () => {
      const diff = computeWordDiff("hello world", "hello world");
      expect(diff.every((d) => d.status === "correct")).toBe(true);
      expect(diff.map((d) => d.word)).toEqual(["hello", "world"]);
    });

    it("ignores punctuation and case differences", () => {
      const diff = computeWordDiff("Hello, World!", "hello world");
      expect(hasErrors(diff)).toBe(false);
    });

    it("flags missing words", () => {
      const diff = computeWordDiff("one two three", "one three");
      expect(diff).toEqual([
        { word: "one", status: "correct" },
        { word: "two", status: "missing" },
        { word: "three", status: "correct" },
      ]);
      expect(hasErrors(diff)).toBe(true);
    });

    it("flags extra words", () => {
      const diff = computeWordDiff("one two", "one extra two");
      expect(diff).toEqual([
        { word: "one", status: "correct" },
        { word: "extra", status: "extra" },
        { word: "two", status: "correct" },
      ]);
    });

    it("flags substitutions as missing+extra pairs", () => {
      const diff = computeWordDiff("one two three", "one TWO three");
      // case-insensitive tokenization makes them equal
      expect(diff.every((d) => d.status === "correct")).toBe(true);

      const diff2 = computeWordDiff("one foo three", "one bar three");
      expect(diff2).toEqual([
        { word: "one", status: "correct" },
        { word: "foo", status: "missing" },
        { word: "bar", status: "extra" },
        { word: "three", status: "correct" },
      ]);
    });
  });

  describe("evaluateComparableTextMatch", () => {
    it("ignores stage directions when scoring the spoken line", () => {
      expect(
        evaluateComparableTextMatch(
          "(in piedi, formale) Silenzio in aula. Si dichiara aperta la seduta.",
          "Silenzio in aula, si dichiara aperta la seduta.",
        ),
      ).toBe("correct");
    });

    it("treats one extra word in a short line as close instead of off", () => {
      expect(
        evaluateComparableTextMatch(
          "Ma da sempre tu no?",
          "Ma certo, da sempre, tu no?",
        ),
      ).toBe("close");
    });
  });
});
