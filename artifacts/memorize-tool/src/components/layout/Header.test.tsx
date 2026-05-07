import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Header from "./Header";

const useAppContextMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock("../../context/AppContext", () => ({
  useAppContext: () => useAppContextMock(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

function appContextDefaults(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    currentLang: "en",
    setLanguage: vi.fn(),
    toggleDarkMode: vi.fn(),
    isAdvancedMode: false,
    setAdvancedMode: vi.fn(),
    isCustomScriptInputEnabled: false,
    setCustomScriptInputEnabled: vi.fn(),
    isLoginEnabled: false,
    setLoginEnabled: vi.fn(),
    ...overrides,
  };
}

describe("Header", () => {
  beforeEach(() => {
    useAppContextMock.mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ isAuthenticated: false });
  });

  it("renders the language selector and core toggle buttons", () => {
    useAppContextMock.mockReturnValue(appContextDefaults());

    render(
      <Header
        onOpenConverter={() => {}}
        onOpenAbout={() => {}}
        onOpenProfile={() => {}}
        onOpenAudioTest={() => {}}
        onOpenSttPerformanceTest={() => {}}
      />,
    );

    expect(screen.getByTestId("languageSelect")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Toggle dark mode" }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Options menu" })).toBeDefined();
  });

  it("opens the options dialog and exposes the About entry", () => {
    useAppContextMock.mockReturnValue(appContextDefaults());
    const onOpenAbout = vi.fn();

    render(
      <Header
        onOpenConverter={() => {}}
        onOpenAbout={onOpenAbout}
        onOpenProfile={() => {}}
        onOpenAudioTest={() => {}}
        onOpenSttPerformanceTest={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Options menu" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();

    const aboutBtn = screen.getByRole("button", { name: "About" });
    fireEvent.click(aboutBtn);
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
  });

  it("does not show the profile button when login is disabled", () => {
    useAppContextMock.mockReturnValue(
      appContextDefaults({ isAdvancedMode: true, isLoginEnabled: false }),
    );

    render(
      <Header
        onOpenConverter={() => {}}
        onOpenAbout={() => {}}
        onOpenProfile={() => {}}
        onOpenAudioTest={() => {}}
        onOpenSttPerformanceTest={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: /Login|Profile/ })).toBeNull();
  });

  it("shows the profile button in advanced mode with login enabled", () => {
    useAppContextMock.mockReturnValue(
      appContextDefaults({ isAdvancedMode: true, isLoginEnabled: true }),
    );

    render(
      <Header
        onOpenConverter={() => {}}
        onOpenAbout={() => {}}
        onOpenProfile={() => {}}
        onOpenAudioTest={() => {}}
        onOpenSttPerformanceTest={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Login" })).toBeDefined();
  });
});
