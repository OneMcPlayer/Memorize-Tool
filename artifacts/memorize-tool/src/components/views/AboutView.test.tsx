import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AboutView from "./AboutView";

const useAppContextMock = vi.fn();

vi.mock("../../context/AppContext", () => ({
  useAppContext: () => useAppContextMock(),
}));

describe("AboutView", () => {
  beforeEach(() => {
    useAppContextMock.mockReset();
  });

  it("renders the English heading, features list and back button", () => {
    useAppContextMock.mockReturnValue({ currentLang: "en" });
    const onBack = vi.fn();

    const { container } = render(<AboutView onBack={onBack} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "About" }),
    ).toBeDefined();
    expect(screen.getByText(/Script Memorization Tool/)).toBeDefined();
    expect(screen.getByText(/Load scripts from the built-in library/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Back" })).toBeDefined();
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders Italian copy when the language is 'it'", () => {
    useAppContextMock.mockReturnValue({ currentLang: "it" });

    render(<AboutView onBack={() => {}} />);

    expect(screen.getByText(/Strumento di Memorizzazione Copioni/)).toBeDefined();
    expect(
      screen.getByText(/Carica copioni dalla libreria integrata/),
    ).toBeDefined();
  });

  it("invokes the onBack callback when the back button is clicked", () => {
    useAppContextMock.mockReturnValue({ currentLang: "en" });
    const onBack = vi.fn();

    render(<AboutView onBack={onBack} />);
    screen.getByRole("button", { name: "Back" }).click();

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
