import type { AlignmentResult, CharacterAlignment, TimingQuality, WordToken } from "./types.js";

type CharTime = { start: number; end: number };

const WORD_COVERAGE_THRESHOLD = 0.95;
// Small slack for float jitter between consecutive provider timestamps —
// a timestamp that's *slightly* earlier than the previous one's end isn't
// treated as the non-monotonic case the acceptance tests target.
const MONOTONIC_EPSILON_SECONDS = 0.005;
// How far ahead we'll peek to resync after a mismatch. A real provider drops
// or duplicates a handful of characters at a time, not dozens, so a small
// window resyncs those cases without risking a wild, wrong jump.
const RESYNC_WINDOW = 6;

function findAheadMatch(
  at: (index: number) => string | undefined,
  fromIndex: number,
  target: string,
): number {
  const targetLower = target.toLowerCase();
  for (let offset = 1; offset <= RESYNC_WINDOW; offset++) {
    const c = at(fromIndex + offset);
    if (c !== undefined && c.toLowerCase() === targetLower) return offset;
  }
  return -1;
}

/**
 * Walks the display text and the provider's character alignment together,
 * matching case-insensitively and tolerating a handful of dropped or extra
 * characters on either side without losing sync for the rest of the page.
 * A timestamp that would make time run backwards is discarded rather than
 * trusted — see docs/decisions/0007-word-timings.md.
 */
function buildCharTimes(text: string, alignment: CharacterAlignment): Array<CharTime | null> {
  const charTimes: Array<CharTime | null> = new Array(text.length).fill(null);
  const { characters, characterStartTimesSeconds, characterEndTimesSeconds } = alignment;

  let ai = 0;
  let ti = 0;
  let lastValidEnd = -Infinity;

  while (ai < characters.length && ti < text.length) {
    const a = characters[ai]!;
    const t = text[ti]!;

    if (a.toLowerCase() === t.toLowerCase()) {
      const start = characterStartTimesSeconds[ai]!;
      const end = characterEndTimesSeconds[ai]!;
      if (Number.isFinite(start) && Number.isFinite(end) && start <= end && start >= lastValidEnd - MONOTONIC_EPSILON_SECONDS) {
        charTimes[ti] = { start, end };
        lastValidEnd = end;
      }
      ai++;
      ti++;
      continue;
    }

    // Mismatch: the provider either dropped one or more text characters or
    // produced extra ones that aren't in the text. Peek ahead on each side —
    // whichever finds a match first (fewest skipped characters) is the real
    // explanation — rather than assuming a single character was involved.
    const textAheadOffset = findAheadMatch((i) => text[i], ti, a);
    const alignAheadOffset = findAheadMatch((i) => characters[i], ai, t);

    if (textAheadOffset !== -1 && (alignAheadOffset === -1 || textAheadOffset <= alignAheadOffset)) {
      ti += textAheadOffset; // text has characters the alignment is missing; leave them untimed
    } else if (alignAheadOffset !== -1) {
      ai += alignAheadOffset; // alignment has extra characters; skip them, keep ti in place
    } else {
      // No resync point within the window — drop both and move on rather than looping.
      ai++;
      ti++;
    }
  }

  return charTimes;
}

function firstCharTime(charTimes: Array<CharTime | null>, start: number, end: number): CharTime | null {
  for (let i = start; i < end; i++) {
    const ct = charTimes[i];
    if (ct) return ct;
  }
  return null;
}

function lastCharTime(charTimes: Array<CharTime | null>, start: number, end: number): CharTime | null {
  for (let i = end - 1; i >= start; i--) {
    const ct = charTimes[i];
    if (ct) return ct;
  }
  return null;
}

/** Fills gaps by borrowing the nearest known neighbor, so every index gets a value. */
function interpolateGaps<T>(values: Array<T | null>, fallback: T): T[] {
  const filled: Array<T | null> = [...values];

  for (let i = 0; i < filled.length; i++) {
    if (filled[i] === null) {
      const prev = [...filled.slice(0, i)].reverse().find((v) => v !== null);
      if (prev !== undefined) filled[i] = prev;
    }
  }
  for (let i = filled.length - 1; i >= 0; i--) {
    if (filled[i] === null) {
      const next = filled.slice(i + 1).find((v) => v !== null);
      if (next !== undefined) filled[i] = next;
    }
  }

  return filled.map((v) => v ?? fallback);
}

/**
 * Contract: tokenize(text) -> WordToken[]; alignWords(text, tokens, alignment)
 * -> { timings, quality }. See docs/decisions/0007-word-timings.md and the
 * T-1.3 task card for the coverage thresholds this implements.
 */
export function alignWords(
  text: string,
  tokens: WordToken[],
  alignment: CharacterAlignment,
): AlignmentResult {
  if (tokens.length === 0) {
    return { timings: [], quality: "none" };
  }

  if (alignment.characters.length === 0) {
    return { timings: tokens.map((): [number, number] => [0, 0]), quality: "none" };
  }

  const charTimes = buildCharTimes(text, alignment);

  const rawWordTimes: Array<CharTime | null> = tokens.map((token) => {
    const start = firstCharTime(charTimes, token.start, token.end);
    const end = lastCharTime(charTimes, token.start, token.end);
    if (!start || !end || end.end < start.start) return null;
    return { start: start.start, end: end.end };
  });

  const validCount = rawWordTimes.filter((t) => t !== null).length;
  const coverage = validCount / tokens.length;

  let quality: TimingQuality;
  let resolved: CharTime[];

  if (coverage >= WORD_COVERAGE_THRESHOLD) {
    quality = "word";
    resolved = interpolateGaps(rawWordTimes, { start: 0, end: 0 });
  } else if (validCount > 0) {
    quality = "sentence";
    resolved = resolveSentenceSpans(tokens, rawWordTimes);
  } else {
    quality = "none";
    return { timings: tokens.map((): [number, number] => [0, 0]), quality };
  }

  const timings: AlignmentResult["timings"] = resolved.map((t) => [
    Math.round(t.start * 1000),
    Math.round(t.end * 1000),
  ]);

  return { timings, quality };
}

/** Every word in a sentence shares that sentence's [minStart, maxEnd] span. */
function resolveSentenceSpans(tokens: WordToken[], rawWordTimes: Array<CharTime | null>): CharTime[] {
  const bySentence = new Map<number, CharTime>();

  for (let i = 0; i < tokens.length; i++) {
    const t = rawWordTimes[i];
    if (!t) continue;
    const sentence = tokens[i]!.sentence;
    const span = bySentence.get(sentence);
    if (!span) {
      bySentence.set(sentence, { ...t });
    } else {
      span.start = Math.min(span.start, t.start);
      span.end = Math.max(span.end, t.end);
    }
  }

  const perToken = tokens.map((token) => bySentence.get(token.sentence) ?? null);
  return interpolateGaps(perToken, { start: 0, end: 0 });
}
