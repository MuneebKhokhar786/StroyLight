import { z } from "zod";
import { eq } from "drizzle-orm";
import { PageCompletionRequestSchema, PageCompletionResponseSchema } from "@storylight/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../../db/client.js";
import { childProfiles, pageCompletions } from "../../../db/schema.js";
import { ProblemError } from "../../plugins/errors.js";

export const pageCompletionsRoutes: FastifyPluginAsyncZod<{ db: Db }> = async (app, opts) => {
  app.post(
    "/api/v1/profiles/:profileId/page-completions",
    {
      preHandler: app.requireFamily,
      schema: {
        params: z.object({ profileId: z.string().uuid() }),
        body: PageCompletionRequestSchema,
        response: { 200: PageCompletionResponseSchema },
      },
    },
    async (request) => {
      const { profileId } = request.params;

      // A mismatch (wrong family, or no such profile at all) is a 404, not a
      // 403 — see section 4 conventions. This is the check every
      // :profileId route relies on.
      const [profile] = await opts.db
        .select({ familyId: childProfiles.familyId })
        .from(childProfiles)
        .where(eq(childProfiles.id, profileId))
        .limit(1);

      if (!profile || profile.familyId !== request.familyId) {
        throw new ProblemError(404, "profile_not_found", "No profile with that id.");
      }

      // Natural-key idempotency: "each page earns once per mode" is the
      // unique constraint (profileId, pageId, mode), not application logic.
      // A retry or a double tap resolves to the same row, not a duplicate.
      await opts.db
        .insert(pageCompletions)
        .values({
          profileId,
          pageId: request.body.pageId,
          mode: request.body.mode,
          dwellMs: request.body.dwellMs,
          helpTaps: request.body.helpTaps,
        })
        .onConflictDoNothing();

      return { recorded: true };
    },
  );
};
