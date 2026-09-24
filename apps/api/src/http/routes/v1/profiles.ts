import { CreateProfileRequestSchema, ProfileSchema } from "@storylight/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../../db/client.js";
import { childProfiles } from "../../../db/schema.js";

export const profilesRoutes: FastifyPluginAsyncZod<{ db: Db }> = async (app, opts) => {
  app.post(
    "/api/v1/profiles",
    {
      preHandler: app.requireFamily,
      schema: { body: CreateProfileRequestSchema, response: { 201: ProfileSchema } },
    },
    async (request, reply) => {
      const [profile] = await opts.db
        .insert(childProfiles)
        .values({
          familyId: request.familyId!,
          heroNameId: request.body.heroNameId,
          avatarComboId: request.body.avatarComboId,
          pronouns: request.body.pronouns,
          ageBand: request.body.ageBand,
        })
        .returning();

      if (!profile) {
        throw new Error("failed to create profile");
      }

      reply.status(201);
      return {
        id: profile.id,
        heroNameId: profile.heroNameId,
        avatarComboId: profile.avatarComboId,
        pronouns: profile.pronouns,
        ageBand: profile.ageBand as "3-4" | "5-6" | "7-8",
      };
    },
  );
};
