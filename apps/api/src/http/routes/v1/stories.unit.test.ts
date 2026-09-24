import { describe, expect, it } from "vitest";
import { buildApp } from "../../../app.js";
import { loadEnv } from "../../../config/env.js";

describe("GET /api/v1/stories/:id", () => {
  const env = loadEnv({ DATABASE_URL: "postgres://unused", NODE_ENV: "test" });

  it("serves the hand-written fixture story", async () => {
    const app = buildApp(env);
    const response = await app.inject({ method: "GET", url: "/api/v1/stories/moonlit-forest-01" });

    expect(response.statusCode).toBe(200);
    const story = response.json();
    expect(story.title).toBe("The Lantern of Moonlit Forest");
    expect(story.pages).toHaveLength(6);
    expect(story.pages[0].tokens.length).toBeGreaterThan(0);
    expect(story.pages[0].timingQuality).toBe("word");

    await app.close();
  });

  it("404s a story id that doesn't exist", async () => {
    const app = buildApp(env);
    const response = await app.inject({ method: "GET", url: "/api/v1/stories/nope" });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("story_not_found");

    await app.close();
  });
});
