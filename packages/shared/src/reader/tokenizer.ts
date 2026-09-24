import type { WordToken } from "./types.js";

// A word is a run of alphanumerics, optionally joined by an internal
// apostrophe (straight or curly, "don't" / "don’t", including a trailing
// possessive like "kids’") or an internal hyphen ("well-known"). An em-dash
// or en-dash is a different code point entirely, so it never matches and
// correctly splits the words on either side of it — same for quotes, commas
// and other punctuation, which simply fall in the gaps between matches.
const WORD_PATTERN = /[\p{L}\p{N}]+(?:(?:['’][\p{L}\p{N}]*|-[\p{L}\p{N}]+))*/gu;

// Sentence end: one or more ./!/?, optionally followed by a closing quote,
// then whitespace or end of string. Digits and abbreviations are forbidden
// by the story validators (section 8.3), so we don't need to special-case
// "Mr." or "3.5" here.
const SENTENCE_END_PATTERN = /[.!?]+["’”]?(?=\s|$)/gu;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"');
}

/**
 * Splits the exact display string into WordTokens. Pure and synchronous —
 * see docs/decisions/0007-word-timings.md for why this runs once at
 * generation time rather than on-device.
 */
export function tokenize(text: string): WordToken[] {
  const sentenceBoundaries: number[] = [];
  for (const match of text.matchAll(SENTENCE_END_PATTERN)) {
    sentenceBoundaries.push(match.index + match[0].length);
  }

  const tokens: WordToken[] = [];
  let sentenceCursor = 0;

  for (const match of text.matchAll(WORD_PATTERN)) {
    const start = match.index;
    const end = start + match[0].length;

    while (
      sentenceCursor < sentenceBoundaries.length &&
      sentenceBoundaries[sentenceCursor]! <= start
    ) {
      sentenceCursor++;
    }

    tokens.push({
      i: tokens.length,
      start,
      end,
      text: match[0],
      norm: normalize(match[0]),
      sentence: sentenceCursor,
    });
  }

  return tokens;
}
