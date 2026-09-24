import { describe, expect, it } from "vitest";
import { tokenize } from "./tokenizer.js";

describe("tokenize", () => {
  it("splits plain words and records exact character offsets", () => {
    const tokens = tokenize("The fox ran.");
    expect(tokens.map((t) => t.text)).toEqual(["The", "fox", "ran"]);
    expect(tokens[0]).toMatchObject({ i: 0, start: 0, end: 3, norm: "the", sentence: 0 });
    expect(tokens[2]).toMatchObject({ start: 8, end: 11 });
  });

  it("keeps a straight-apostrophe contraction as one word", () => {
    const tokens = tokenize("It's warm today.");
    expect(tokens.map((t) => t.text)).toEqual(["It's", "warm", "today"]);
    expect(tokens[0]!.norm).toBe("it's");
  });

  it("keeps a curly-apostrophe contraction as one word and normalizes it", () => {
    const tokens = tokenize("She couldn’t see the moon.");
    expect(tokens.map((t) => t.text)).toEqual(["She", "couldn’t", "see", "the", "moon"]);
    expect(tokens[1]!.norm).toBe("couldn't");
  });

  it("keeps a trailing possessive apostrophe as part of the word", () => {
    const tokens = tokenize("The kids’ toys were everywhere.");
    expect(tokens[1]!.text).toBe("kids’");
  });

  it("keeps a hyphenated compound word as one token", () => {
    const tokens = tokenize("A well-known secret place.");
    expect(tokens.map((t) => t.text)).toEqual(["A", "well-known", "secret", "place"]);
  });

  it("splits words on either side of an em-dash", () => {
    const tokens = tokenize("She waited—then ran.");
    expect(tokens.map((t) => t.text)).toEqual(["She", "waited", "then", "ran"]);
  });

  it("excludes surrounding quotes from word text", () => {
    const tokens = tokenize('"Hello," she said.');
    expect(tokens.map((t) => t.text)).toEqual(["Hello", "she", "said"]);
  });

  it("excludes curly quotes from word text", () => {
    const tokens = tokenize("“Wait for me,” he called.");
    expect(tokens.map((t) => t.text)).toEqual(["Wait", "for", "me", "he", "called"]);
  });

  it("assigns increasing sentence indices across sentence boundaries", () => {
    const tokens = tokenize("The fox ran. The owl watched! Did it work?");
    expect(tokens.map((t) => t.sentence)).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2]);
  });

  it("keeps a quoted sentence-ending line inside one sentence boundary", () => {
    const tokens = tokenize('She said, "I see it." Then she smiled.');
    const bySentence = new Map<number, string[]>();
    for (const t of tokens) {
      bySentence.set(t.sentence, [...(bySentence.get(t.sentence) ?? []), t.text]);
    }
    expect(bySentence.get(0)).toEqual(["She", "said", "I", "see", "it"]);
    expect(bySentence.get(1)).toEqual(["Then", "she", "smiled"]);
  });

  it("returns an empty array for text with no words", () => {
    expect(tokenize("... — \"\"")).toEqual([]);
  });
});
