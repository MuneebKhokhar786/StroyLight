import { describe, expect, it } from "vitest";
import { alignWords } from "./alignment.js";
import { fromElevenLabsAlignment, type ElevenLabsAlignment } from "./providers.js";
import { tokenize } from "./tokenizer.js";
import type { CharacterAlignment } from "./types.js";
import sampleRecording from "./__fixtures__/sample-elevenlabs-alignment.json" with { type: "json" };

const MS_PER_CHAR = 80;

/** A clean, character-for-character alignment — the common case. */
function perfectAlignment(text: string): CharacterAlignment {
  const characters = text.split("");
  return {
    characters,
    characterStartTimesSeconds: characters.map((_, i) => (i * MS_PER_CHAR) / 1000),
    characterEndTimesSeconds: characters.map((_, i) => ((i + 1) * MS_PER_CHAR) / 1000),
  };
}

describe("alignWords", () => {
  it("aligns every word at word-level quality against a clean alignment", () => {
    const text = "The fox ran fast.";
    const tokens = tokenize(text);
    const { timings, quality } = alignWords(text, tokens, perfectAlignment(text));

    expect(quality).toBe("word");
    expect(timings).toHaveLength(tokens.length);
    // Monotonic: each word starts at or after the previous word's end.
    for (let i = 1; i < timings.length; i++) {
      expect(timings[i]![0]).toBeGreaterThanOrEqual(timings[i - 1]![1]);
    }
    // "The" is the first 3 characters, at MS_PER_CHAR each.
    expect(timings[0]).toEqual([0, 3 * MS_PER_CHAR]);
  });

  it("returns 'none' with zeroed timings when there is no alignment at all", () => {
    const text = "The fox ran.";
    const tokens = tokenize(text);
    const { timings, quality } = alignWords(text, tokens, {
      characters: [],
      characterStartTimesSeconds: [],
      characterEndTimesSeconds: [],
    });

    expect(quality).toBe("none");
    expect(timings).toEqual(tokens.map(() => [0, 0]));
  });

  it("tolerates a handful of characters missing from the alignment", () => {
    const text = "The quiet forest was very still and calm indeed.";
    const tokens = tokenize(text);
    const alignment = perfectAlignment(text);

    // Drop 2 of ~44 characters — well under the 5% budget.
    alignment.characters.splice(10, 2);
    alignment.characterStartTimesSeconds.splice(10, 2);
    alignment.characterEndTimesSeconds.splice(10, 2);

    const { quality, timings } = alignWords(text, tokens, alignment);

    expect(quality).toBe("word");
    expect(timings).toHaveLength(tokens.length);
    expect(timings.every(([start, end]) => end >= start)).toBe(true);
  });

  it("degrades to sentence-level spans when word coverage falls below 95%", () => {
    const text = "The quiet forest was very still and calm indeed today.";
    const tokens = tokenize(text);
    const alignment = perfectAlignment(text);

    // Drop most of the back half of the alignment to push coverage well below threshold.
    const cut = Math.floor(alignment.characters.length * 0.5);
    alignment.characters.splice(cut);
    alignment.characterStartTimesSeconds.splice(cut);
    alignment.characterEndTimesSeconds.splice(cut);

    const { quality, timings } = alignWords(text, tokens, alignment);

    expect(quality).toBe("sentence");
    expect(timings).toHaveLength(tokens.length);
    // Every word in the (single) sentence shares the same span.
    const unique = new Set(timings.map(([s, e]) => `${s}:${e}`));
    expect(unique.size).toBe(1);
  });

  it("discards a non-monotonic timestamp instead of trusting it", () => {
    const text = "The fox ran fast.";
    const tokens = tokenize(text);
    const alignment = perfectAlignment(text);

    // Corrupt one character in the middle of "fox" so its timestamp runs backwards.
    const foxIndex = text.indexOf("fox") + 1; // the 'o' in "fox"
    alignment.characterStartTimesSeconds[foxIndex] = 0.01;
    alignment.characterEndTimesSeconds[foxIndex] = 0.02;

    const { quality, timings } = alignWords(text, tokens, alignment);

    // "fox" still gets a sensible span from its other two characters, and the
    // rest of the page is unaffected — a single bad timestamp doesn't cascade.
    expect(quality).toBe("word");
    const foxToken = tokens.find((t) => t.text === "fox")!;
    const foxTiming = timings[foxToken.i]!;
    expect(foxTiming[0]).toBeGreaterThanOrEqual(timings[0]![1]);
    expect(foxTiming[1]).toBeGreaterThan(foxTiming[0]);
  });

  it("aligns a recorded fixture at at least 95% word coverage", () => {
    const { text, alignment } = sampleRecording as { text: string; alignment: ElevenLabsAlignment };
    const tokens = tokenize(text);
    const characterAlignment = fromElevenLabsAlignment(alignment);

    const { quality, timings } = alignWords(text, tokens, characterAlignment);

    expect(quality).toBe("word");
    expect(timings).toHaveLength(tokens.length);

    // Print the aligned page as a table — the evidence the T-1.3 task card asks for.
    console.table(
      tokens.map((t, i) => ({
        word: t.text,
        startMs: timings[i]![0],
        endMs: timings[i]![1],
      })),
    );
  });
});
