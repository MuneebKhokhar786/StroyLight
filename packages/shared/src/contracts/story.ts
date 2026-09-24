import { z } from "zod";

export const WordTokenSchema = z.object({
  i: z.number().int().nonnegative(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  text: z.string().min(1),
  norm: z.string().min(1),
  sentence: z.number().int().nonnegative(),
});

export const TimingQualitySchema = z.enum(["word", "sentence", "none"]);

export const StoryPageSchema = z.object({
  id: z.string(),
  pageNumber: z.number().int().positive(),
  text: z.string().min(1),
  tokens: z.array(WordTokenSchema),
  starWordIndices: z.array(z.number().int().nonnegative()),
  illustrationUrl: z.string(),
  narrationUrl: z.string().nullable(),
  /** [startMs, endMs] per token, same order and length as `tokens`. */
  timings: z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])),
  timingQuality: TimingQualitySchema,
});

export const StorySchema = z.object({
  id: z.string(),
  kind: z.enum(["original", "personal"]),
  title: z.string(),
  worldId: z.string(),
  pages: z.array(StoryPageSchema),
});

export type WordTokenDTO = z.infer<typeof WordTokenSchema>;
export type StoryPage = z.infer<typeof StoryPageSchema>;
export type Story = z.infer<typeof StorySchema>;
