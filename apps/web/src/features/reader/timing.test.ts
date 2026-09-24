import { describe, expect, it } from "vitest";
import { findWordIndexAtTime } from "./timing.js";

describe("findWordIndexAtTime", () => {
  const timings: Array<[number, number]> = [
    [0, 200],
    [200, 500],
    [500, 900],
    [900, 1300],
  ];

  it("returns -1 for an empty page", () => {
    expect(findWordIndexAtTime([], 100)).toBe(-1);
  });

  it("finds the word containing the given time", () => {
    expect(findWordIndexAtTime(timings, 0)).toBe(0);
    expect(findWordIndexAtTime(timings, 250)).toBe(1);
    expect(findWordIndexAtTime(timings, 899)).toBe(2);
    expect(findWordIndexAtTime(timings, 900)).toBe(3);
  });

  it("clamps to the last word once past the end", () => {
    expect(findWordIndexAtTime(timings, 999_999)).toBe(3);
  });

  it("clamps to the first word before the start", () => {
    expect(findWordIndexAtTime(timings, -50)).toBe(0);
  });
});
