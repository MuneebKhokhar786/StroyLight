import { z } from "zod";

export const ReaderModeSchema = z.enum(["listen", "together", "read_it_myself"]);
export type ReaderMode = z.infer<typeof ReaderModeSchema>;

export const StarWordResultSchema = z.object({
  wordIndex: z.number().int().nonnegative(),
  selfChecked: z.boolean(),
});

export const PageCompletionRequestSchema = z.object({
  pageId: z.string(),
  mode: ReaderModeSchema,
  dwellMs: z.number().int().nonnegative(),
  helpTaps: z.number().int().nonnegative(),
  starResults: z.array(StarWordResultSchema).default([]),
});
export type PageCompletionRequest = z.infer<typeof PageCompletionRequestSchema>;

export const PageCompletionResponseSchema = z.object({
  recorded: z.boolean(),
  // Reward computation is server-authoritative and lands with the economy in
  // Phase 3 (section 7) — completions are tracked from Phase 1 so nothing is
  // lost, but no stars are granted yet.
});
export type PageCompletionResponse = z.infer<typeof PageCompletionResponseSchema>;
