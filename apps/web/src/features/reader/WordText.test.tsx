// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { StoryPage } from "@storylight/shared";
import { WordText } from "./WordText.js";

function buildPage(overrides: Partial<StoryPage> = {}): StoryPage {
  const text = "The fox ran. It jumped high.";
  return {
    id: "test-page",
    pageNumber: 1,
    text,
    tokens: [
      { i: 0, start: 0, end: 3, text: "The", norm: "the", sentence: 0 },
      { i: 1, start: 4, end: 7, text: "fox", norm: "fox", sentence: 0 },
      { i: 2, start: 8, end: 11, text: "ran", norm: "ran", sentence: 0 },
      { i: 3, start: 13, end: 15, text: "It", norm: "it", sentence: 1 },
      { i: 4, start: 16, end: 22, text: "jumped", norm: "jumped", sentence: 1 },
      { i: 5, start: 23, end: 27, text: "high", norm: "high", sentence: 1 },
    ],
    starWordIndices: [],
    illustrationUrl: "/placeholder.svg",
    narrationUrl: null,
    timings: [
      [0, 200],
      [200, 400],
      [400, 600],
      [600, 800],
      [800, 1000],
      [1000, 1200],
    ],
    timingQuality: "word",
    ...overrides,
  };
}

describe("WordText", () => {
  it("renders the exact display text with punctuation and spacing intact", () => {
    const { container } = render(<WordText page={buildPage()} highlight={{ kind: "none" }} onTapWord={vi.fn()} />);
    expect(container.querySelector(".reader-text")?.textContent).toBe("The fox ran. It jumped high.");
  });

  it("highlights only the active word", () => {
    render(<WordText page={buildPage()} highlight={{ kind: "word", wordIndex: 1 }} onTapWord={vi.fn()} />);
    expect(screen.getByRole("button", { name: 'Hear "fox"' }).className).toContain("word--active");
    expect(screen.getByRole("button", { name: 'Hear "ran"' }).className).not.toContain("word--active");
  });

  it("marks the awaited star word distinctly from a plain active word", () => {
    render(<WordText page={buildPage()} highlight={{ kind: "starWord", wordIndex: 2 }} onTapWord={vi.fn()} />);
    const ranButton = screen.getByRole("button", { name: 'Hear "ran"' });
    expect(ranButton.className).toContain("word--active");
    expect(ranButton.className).toContain("word--star-waiting");
  });

  it("highlights every word in the current sentence, not just one — the degraded-timing fallback", () => {
    render(<WordText page={buildPage()} highlight={{ kind: "sentence", sentenceIndex: 1 }} onTapWord={vi.fn()} />);
    for (const word of ["It", "jumped", "high"]) {
      expect(screen.getByRole("button", { name: `Hear "${word}"` }).className).toContain("word--active");
    }
    for (const word of ["The", "fox", "ran"]) {
      expect(screen.getByRole("button", { name: `Hear "${word}"` }).className).not.toContain("word--active");
    }
  });

  it("dims every word outside the current line in I'll Read mode", () => {
    render(
      <WordText
        page={buildPage()}
        highlight={{ kind: "sentence", sentenceIndex: 0 }}
        dimOutsideSentence={0}
        onTapWord={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: 'Hear "The"' }).className).not.toContain("word--dimmed");
    expect(screen.getByRole("button", { name: 'Hear "jumped"' }).className).toContain("word--dimmed");
  });

  it("renders plain, untinted text when there's no usable timing at all", () => {
    render(<WordText page={buildPage()} highlight={{ kind: "none" }} onTapWord={vi.fn()} />);
    for (const word of ["The", "fox", "ran", "It", "jumped", "high"]) {
      const button = screen.getByRole("button", { name: `Hear "${word}"` });
      expect(button.className).not.toContain("word--active");
      expect(button.className).not.toContain("word--dimmed");
    }
  });

  it("calls onTapWord with the token index, not the DOM index", () => {
    const onTapWord = vi.fn();
    render(<WordText page={buildPage()} highlight={{ kind: "none" }} onTapWord={onTapWord} />);
    screen.getByRole("button", { name: 'Hear "jumped"' }).click();
    expect(onTapWord).toHaveBeenCalledWith(4);
  });
});
