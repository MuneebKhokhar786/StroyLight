import { z } from "zod";

export const SessionResponse = z.object({
  familyId: z.string().uuid(),
});
export type SessionResponse = z.infer<typeof SessionResponse>;
