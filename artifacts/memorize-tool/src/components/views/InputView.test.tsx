import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InputView from "./InputView";

const useAppContextMock = vi.fn();

vi.mock("../../context/AppContext", () => ({
  useAppContext: () => useAppContextMock(),
}));

vi.mock("../../utils", () => ({
  showToast: vi.fn(),
  readFileContent: vi.fn().mockResolvedValue(""),
}));

vi.mock("../common/ScriptModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="script-modal" /> : null,
}));

vi.mock("../../data/scripts", () => ({
  getAvailableScripts: () => [
    { id: "hamlet", title: "Hamlet" },
    { id: "macbeth", title: "Macbeth" },
  ],
  getScriptContent: (id: string) =>
    id === "hamlet" ? "HAMLET: To be or not to be.\nHORATIO: My lord." : "",
  convertJsonScriptToText: (s: unknown) => String(s),
}));

function appContextDefaults(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    currentLang: "en",
    isAdvancedMode: false,
    isCustomScriptInputEnabled: false,
    setScriptLines: vi.fn(),
    setExtractedLines: vi.fn(),
    setPrecedingCount: vi.fn(),
    resetScriptState: vi.fn(),
    ...overrides,
  };
}

describe("InputView (script picker)", () => {
  beforeEach(() => {
    useAppContextMock.mockReset();
  });

  it("renders the basic-mode script picker with the library dropdown", () => {
    useAppContextMock.mockReturnValue(appContextDefaults());

    const { container } = render(
      <InputView
        onStartPractice={() => {}}
        onStartMemorization={() => {}}
        onOpenConverter={() => {}}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /Script Memorization/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 3, name: "Select a Script" }),
    ).toBeDefined();
    expect(screen.getByRole("option", { name: "Hamlet" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Macbeth" })).toBeDefined();
    expect(container.firstChild).toMatchSnapshot();
  });

  it("advances to the character selection step after picking a script", () => {
    useAppContextMock.mockReturnValue(appContextDefaults());

    render(
      <InputView
        onStartPractice={() => {}}
        onStartMemorization={() => {}}
        onOpenConverter={() => {}}
      />,
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "hamlet" },
    });

    expect(
      screen.getByRole("heading", { level: 3, name: "Select Your Character" }),
    ).toBeDefined();
    expect(screen.getByRole("option", { name: "HAMLET" })).toBeDefined();
  });

  it("renders the advanced-mode picker with library/paste/file tabs when custom input is enabled", () => {
    useAppContextMock.mockReturnValue(
      appContextDefaults({
        isAdvancedMode: true,
        isCustomScriptInputEnabled: true,
      }),
    );

    render(
      <InputView
        onStartPractice={() => {}}
        onStartMemorization={() => {}}
        onOpenConverter={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Library" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Paste" })).toBeDefined();
    expect(screen.getByRole("button", { name: "File" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Start Practice" })).toBeDefined();
  });
});
