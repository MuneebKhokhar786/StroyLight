import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { StorySchema, type Story } from "@storylight/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ProblemError } from "../../plugins/errors.js";

/**
 * No story/story_page tables or AI pipeline exist yet (that's Phase 2). For
 * now this serves the one hand-written fixture from Phase 1 — see
 * scripts/generate-fixture-story.ts — so Reader Mode has a real story to
 * read against per the contract in section 4 (one fetch per story).
 */
const FIXTURE_PATH = fileURLToPath(
  new URL("../../../../fixtures/hand-made/moonlit-forest-01.json", import.meta.url),
);

let cachedStory: Story | undefined;

function loadFixtureStory(): Story {
  if (!cachedStory) {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
    cachedStory = StorySchema.parse(raw);
  }
  return cachedStory;
}

export const storiesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/api/v1/stories/:id",
    { schema: { params: z.object({ id: z.string() }), response: { 200: StorySchema } } },
    async (request) => {
      const story = loadFixtureStory();
      if (request.params.id !== story.id) {
        throw new ProblemError(404, "story_not_found", "No story with that id.");
      }
      return story;
    },
  );
};
