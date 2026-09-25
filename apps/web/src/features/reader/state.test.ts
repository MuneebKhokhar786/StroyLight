import { describe, expect, it } from "vitest";
import { initialReaderPhase, readerReducer } from "./state.js";

function pageReady(overrides: Partial<{ hasAudio: boolean; timingQuality: "word" | "sentence" | "none" }> = {}) {
  return readerReducer(initialReaderPhase, {
    type: "PAGE_READY" as const,
    hasAudio: false,
    timingQuality: "word" as const,
    ...overrides,
  });
}

describe("readerReducer", () => {
  it("goes straight to narrating when the page has no audio to unlock", () => {
    expect(pageReady()).toEqual({ kind: "narrating", word: 0 });
  });

  it("waits for a tap to unlock audio when the page has a real recording", () => {
    const state = pageReady({ hasAudio: true });
    expect(state).toEqual({ kind: "awaitingFirstTap" });
    expect(readerReducer(state, { type: "AUDIO_UNLOCKED" })).toEqual({ kind: "narrating", word: 0 });
  });

  it("goes to degraded when the page has no usable timing at all, even with audio", () => {
    // No timing data means there's nothing to unlock playback into sync
    // with — section 5.6's "no usable timing" fallback wins regardless.
    expect(pageReady({ hasAudio: true, timingQuality: "none" })).toEqual({ kind: "degraded" });
  });

  it("still narrates at sentence-level word coverage — rendering degrades, tracking doesn't", () => {
    expect(pageReady({ timingQuality: "sentence" })).toEqual({ kind: "narrating", word: 0 });
  });

  it("ignores AUDIO_UNLOCKED once already narrating", () => {
    const narrating = pageReady();
    expect(readerReducer(narrating, { type: "AUDIO_UNLOCKED" })).toEqual(narrating);
  });

  it("advances the highlighted word while narrating", () => {
    let state = pageReady();
    state = readerReducer(state, { type: "WORD_ADVANCED", word: 3 });
    expect(state).toEqual({ kind: "narrating", word: 3 });
  });

  it("pauses at a star word and resumes narrating from the same word on resolution", () => {
    let state = pageReady();
    state = readerReducer(state, { type: "WORD_ADVANCED", word: 5 });
    state = readerReducer(state, { type: "STAR_WORD_REACHED", word: 5, deadline: 1234 });
    expect(state).toEqual({ kind: "awaitingStarWord", word: 5, deadline: 1234 });

    state = readerReducer(state, { type: "STAR_WORD_RESOLVED" });
    expect(state).toEqual({ kind: "narrating", word: 5 });
  });

  it("never lets a star word be reached outside of narrating", () => {
    const degraded = pageReady({ timingQuality: "none" });
    const result = readerReducer(degraded, { type: "STAR_WORD_REACHED", word: 2, deadline: 1 });
    expect(result).toBe(degraded);
  });

  it("ends the page from any phase", () => {
    expect(readerReducer(pageReady(), { type: "PAGE_ENDED" })).toEqual({ kind: "pageDone" });
    expect(readerReducer(pageReady({ timingQuality: "none" }), { type: "PAGE_ENDED" })).toEqual({
      kind: "pageDone",
    });
  });

  it("resets back to loading for a new page", () => {
    const done = readerReducer(initialReaderPhase, { type: "PAGE_ENDED" });
    expect(readerReducer(done, { type: "RESET" })).toEqual({ kind: "loading" });
  });
});
