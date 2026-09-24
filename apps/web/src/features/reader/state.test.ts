import { describe, expect, it } from "vitest";
import { initialReaderPhase, readerReducer } from "./state.js";

describe("readerReducer", () => {
  it("goes straight to narrating when the page has no audio to unlock", () => {
    const state = readerReducer(initialReaderPhase, { type: "PAGE_READY", hasAudio: false });
    expect(state).toEqual({ kind: "narrating", word: 0 });
  });

  it("waits for a tap to unlock audio when the page has a real recording", () => {
    const state = readerReducer(initialReaderPhase, { type: "PAGE_READY", hasAudio: true });
    expect(state).toEqual({ kind: "awaitingFirstTap" });
    expect(readerReducer(state, { type: "AUDIO_UNLOCKED" })).toEqual({ kind: "narrating", word: 0 });
  });

  it("ignores AUDIO_UNLOCKED once already narrating", () => {
    const narrating = readerReducer(initialReaderPhase, { type: "PAGE_READY", hasAudio: false });
    expect(readerReducer(narrating, { type: "AUDIO_UNLOCKED" })).toEqual(narrating);
  });

  it("advances the highlighted word while narrating", () => {
    let state = readerReducer(initialReaderPhase, { type: "PAGE_READY", hasAudio: false });
    state = readerReducer(state, { type: "WORD_ADVANCED", word: 3 });
    expect(state).toEqual({ kind: "narrating", word: 3 });
  });

  it("pauses at a star word and resumes narrating from the same word on resolution", () => {
    let state = readerReducer(initialReaderPhase, { type: "PAGE_READY", hasAudio: false });
    state = readerReducer(state, { type: "WORD_ADVANCED", word: 5 });
    state = readerReducer(state, { type: "STAR_WORD_REACHED", word: 5, deadline: 1234 });
    expect(state).toEqual({ kind: "awaitingStarWord", word: 5, deadline: 1234 });

    state = readerReducer(state, { type: "STAR_WORD_RESOLVED" });
    expect(state).toEqual({ kind: "narrating", word: 5 });
  });

  it("never lets a star word be reached outside of narrating", () => {
    const selfReading = readerReducer(initialReaderPhase, { type: "ENTER_SELF_READING" });
    const result = readerReducer(selfReading, { type: "STAR_WORD_REACHED", word: 2, deadline: 1 });
    expect(result).toBe(selfReading);
  });

  it("ends the page from any phase", () => {
    const narrating = readerReducer(initialReaderPhase, { type: "PAGE_READY", hasAudio: false });
    expect(readerReducer(narrating, { type: "PAGE_ENDED" })).toEqual({ kind: "pageDone" });
  });

  it("resets back to loading for a new page", () => {
    const done = readerReducer(initialReaderPhase, { type: "PAGE_ENDED" });
    expect(readerReducer(done, { type: "RESET" })).toEqual({ kind: "loading" });
  });
});
