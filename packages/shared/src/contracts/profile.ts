import { z } from "zod";

export const AgeBandSchema = z.enum(["3-4", "5-6", "7-8"]);
export type AgeBand = z.infer<typeof AgeBandSchema>;

export const CreateProfileRequestSchema = z.object({
  heroNameId: z.string().min(1),
  avatarComboId: z.string().min(1),
  pronouns: z.string().min(1),
  ageBand: AgeBandSchema,
});
export type CreateProfileRequest = z.infer<typeof CreateProfileRequestSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  heroNameId: z.string(),
  avatarComboId: z.string(),
  pronouns: z.string(),
  ageBand: AgeBandSchema,
});
export type Profile = z.infer<typeof ProfileSchema>;
