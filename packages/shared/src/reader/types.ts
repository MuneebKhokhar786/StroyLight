/** A single word as it appears in the exact display string — see docs/decisions/0007. */
export type WordToken = {
  /** Index of this word within the page, in reading order. */
  i: number;
  /** Start offset (inclusive) into the display string. */
  start: number;
  /** End offset (exclusive) into the display string. */
  end: number;
  /** The exact substring as displayed, e.g. "don't" or "well-known". */
  text: string;
  /** Lowercased, punctuation-trimmed form used for matching (never for display). */
  norm: string;
  /** Index of the sentence this word belongs to, 0-based. */
  sentence: number;
};

export type TimingQuality = "word" | "sentence" | "none";

/** [startMs, endMs] per word, in the same order as the tokens. */
export type WordTimings = Array<[number, number]>;

export type AlignmentResult = {
  timings: WordTimings;
  quality: TimingQuality;
};

/**
 * Character-level alignment as returned by a TTS provider's timestamped
 * endpoint (e.g. ElevenLabs): one entry per character, in seconds.
 */
export type CharacterAlignment = {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
};
