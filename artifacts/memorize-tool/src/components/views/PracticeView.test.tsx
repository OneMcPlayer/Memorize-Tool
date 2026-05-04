import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PracticeView from "./PracticeView";

const useAppContextMock = vi.fn();

vi.mock("../../context/AppContext", () => ({
  useAppContext: () => useAppContextMock(),
}));

vi.mock("../../utils", () => ({
  showToast: vi.fn(),
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
  getPlainText: (s: string) => s,
}));

const baseLine = {
  index: 0,
  line: "To be or not to be.",
  speaker: "HAMLET",
};

type LineData = {
  current: typeof baseLine;
  context: { speaker: string; line: string }[];
  isLastLine: boolean;
} | null;

function makeContext(overrides: Partial<ReturnType<typeof defaults>> = {}) {
  return { ...defaults(), ...overrides };
}

function defaults() {
  return {
    currentLang: "en",
    extractedLines: [baseLine],
    currentLineIndex: 0,
    nextLine: vi.fn(),
    getCurrentLineData: (): LineData => ({
      current: baseLine,
      context: [{ speaker: "HORATIO", line: "Hail to your lordship!" }],
      isLastLine: true,
    }),
  };
}

describe("PracticeView", () => {
  beforeEach(() => {
    useAppContextMock.mockReset();
  });

  it("renders the practice heading, context and the verify/finish buttons", () => {
    useAppContextMock.mockReturnValue(makeContext());

    const { container } = render(<PracticeView onBack={() => {}} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Practice Mode" }),
    ).toBeDefined();
    expect(screen.getByText("Context:")).toBeDefined();
    expect(
      screen.getByText("HORATIO: Hail to your lordship!"),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /Verify My Line/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Finish Practice/ })).toBeDefined();
    expect(container.firstChild).toMatchSnapshot();
  });

  it("reveals the line after pressing 'Verify My Line'", () => {
    useAppContextMock.mockReturnValue(makeContext());

    render(<PracticeView onBack={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Verify My Line/ }));

    expect(screen.getByText(/To be or not to be/)).toBeDefined();
    expect(screen.getByText("HAMLET:")).toBeDefined();
  });

  it("shows the no-lines fallback when there is no current line data", () => {
    useAppContextMock.mockReturnValue(
      makeContext({ getCurrentLineData: () => null }),
    );

    render(<PracticeView onBack={() => {}} />);

    expect(screen.getByText(/No lines found for the character/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Restart" })).toBeDefined();
  });

  it("shows the completion screen after finishing the last line", () => {
    useAppContextMock.mockReturnValue(makeContext());

    const { container } = render(<PracticeView onBack={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Finish Practice/ }));

    expect(
      screen.getByRole("heading", { level: 2, name: /Practice complete/ }),
    ).toBeDefined();
    expect(screen.getByText(/Lines completed: 1/)).toBeDefined();
    expect(container.firstChild).toMatchSnapshot();
  });
});
