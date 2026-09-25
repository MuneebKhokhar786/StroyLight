import { z } from "zod";

export const AgeBandSchema = z.enum(["3-4", "5-6", "7-8"]);
export type AgeBand = z.infer<typeof AgeBandSchema>;

export const PronounsSchema = z.enum(["she/her", "he/him", "they/them"]);
export type Pronouns = z.infer<typeof PronounsSchema>;

/**
 * Hero names and avatar combos are picked from a curated catalog (ADR-0006:
 * no free text from children) — the client only ever sends a fixed slug it
 * didn't construct from user input. The server enforces that shape too,
 * rather than trusting the client: a slug pattern with a real length bound,
 * not an open-ended string a malicious or buggy client could stuff with
 * arbitrary data.
 */
const CuratedIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "must be a lowercase slug (letters, digits, hyphens)");

export const CreateProfileRequestSchema = z.object({
  heroNameId: CuratedIdSchema,
  avatarComboId: CuratedIdSchema,
  pronouns: PronounsSchema,
  ageBand: AgeBandSchema,
});
export type CreateProfileRequest = z.infer<typeof CreateProfileRequestSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  heroNameId: CuratedIdSchema,
  avatarComboId: CuratedIdSchema,
  pronouns: PronounsSchema,
  ageBand: AgeBandSchema,
});
export type Profile = z.infer<typeof ProfileSchema>;
