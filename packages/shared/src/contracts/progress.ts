import { z } from "zod";

export const ReaderModeSchema = z.enum(["listen", "together", "read_it_myself"]);
export type ReaderMode = z.infer<typeof ReaderModeSchema>;

// Generous but real bounds — not to model the domain precisely, but so a
// buggy or hostile client can't wedge an absurd value into the database.
// A page has a handful of words and star words, and reading one page rarely
// takes more than an hour.
const MAX_WORD_INDEX = 2000;
const MAX_DWELL_MS = 60 * 60 * 1000;
const MAX_HELP_TAPS = 1000;
const MAX_STAR_RESULTS = 20;

export const StarWordResultSchema = z.object({
  wordIndex: z.number().int().nonnegative().max(MAX_WORD_INDEX),
  selfChecked: z.boolean(),
});

export const PageCompletionRequestSchema = z.object({
  pageId: z.string().min(1).max(128),
  mode: ReaderModeSchema,
  dwellMs: z.number().int().nonnegative().max(MAX_DWELL_MS),
  helpTaps: z.number().int().nonnegative().max(MAX_HELP_TAPS),
  starResults: z.array(StarWordResultSchema).max(MAX_STAR_RESULTS).default([]),
});
export type PageCompletionRequest = z.infer<typeof PageCompletionRequestSchema>;

export const PageCompletionResponseSchema = z.object({
  recorded: z.boolean(),
  // Reward computation is server-authoritative and lands with the economy in
  // Phase 3 (section 7) — completions are tracked from Phase 1 so nothing is
  // lost, but no stars are granted yet.
});
export type PageCompletionResponse = z.infer<typeof PageCompletionResponseSchema>;
