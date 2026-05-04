import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScriptMemorizationPractice from "./ScriptMemorizationPractice";

const useAppContextMock = vi.fn();

vi.mock("../../context/AppContext", () => ({
  useAppContext: () => useAppContextMock(),
}));

vi.mock("./InteractiveMemorizationView", () => ({
  default: () => <div data-testid="interactive-memorization-view" />,
}));

vi.mock("../AccessGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("ScriptMemorizationPractice", () => {
  beforeEach(() => {
    useAppContextMock.mockReset();
    useAppContextMock.mockReturnValue({
      currentLang: "en",
      scriptLines: ["HAMLET: To be or not to be."],
      extractedLines: [{ index: 0, line: "To be or not to be.", speaker: "HAMLET" }],
    });
  });

  it("renders the intro screen with the start and back buttons", () => {
    const { container } = render(<ScriptMemorizationPractice onBack={() => {}} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Script Memorization Practice/,
      }),
    ).toBeDefined();
    expect(screen.getByText(/How It Works/)).toBeDefined();
    expect(screen.getByText(/Benefits/)).toBeDefined();
    expect(screen.getByRole("button", { name: /Start Practice/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Back/ })).toBeDefined();
    expect(container.firstChild).toMatchSnapshot();
  });

  it("calls onBack when the back button is clicked from the intro", () => {
    const onBack = vi.fn();
    render(<ScriptMemorizationPractice onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: /Back/ }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("transitions to the interactive memorization view after pressing start", () => {
    render(<ScriptMemorizationPractice onBack={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /Start Practice/ }));

    expect(screen.getByTestId("interactive-memorization-view")).toBeDefined();
  });
});
