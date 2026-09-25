import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { buildApp } from "../../../app.js";
import { loadEnv } from "../../../config/env.js";
import { createDb, type Db } from "../../../db/client.js";
import { pageCompletions } from "../../../db/schema.js";
import type { FastifyInstance } from "fastify";

const CLIENT_HEADER = { "x-storylight-client": "integration-test" };

async function startSession(app: FastifyInstance): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/api/v1/session", headers: CLIENT_HEADER });
  const setCookie = res.headers["set-cookie"];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) throw new Error("no session cookie returned");
  return raw.split(";")[0]!;
}

async function createProfile(app: FastifyInstance, cookie: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/profiles",
    headers: { ...CLIENT_HEADER, cookie },
    payload: { heroNameId: "nora", avatarComboId: "default", pronouns: "she/her", ageBand: "5-6" },
  });
  if (res.statusCode !== 201) throw new Error(`profile creation failed: ${res.statusCode} ${res.body}`);
  return res.json().id;
}

describe("page-completions (integration)", () => {
  let app: FastifyInstance;
  let db: Db;

  beforeEach(() => {
    const env = loadEnv({ DATABASE_URL: process.env.DATABASE_URL, NODE_ENV: "test" });
    db = createDb(env);
    app = buildApp(env, db);
  });

  afterEach(async () => {
    await app.close();
    await db.$client.end();
  });

  it("records a completion", async () => {
    const cookie = await startSession(app);
    const profileId = await createProfile(app, cookie);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/profiles/${profileId}/page-completions`,
      headers: { ...CLIENT_HEADER, cookie },
      payload: { pageId: "p1", mode: "listen", dwellMs: 4200, helpTaps: 1, starResults: [] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ recorded: true });
  });

  it("is idempotent: a retry with different values doesn't create a second row or overwrite the first", async () => {
    const cookie = await startSession(app);
    const profileId = await createProfile(app, cookie);
    const body = (dwellMs: number, helpTaps: number) => ({
      pageId: "p1",
      mode: "listen" as const,
      dwellMs,
      helpTaps,
      starResults: [],
    });

    const first = await app.inject({
      method: "POST",
      url: `/api/v1/profiles/${profileId}/page-completions`,
      headers: { ...CLIENT_HEADER, cookie },
      payload: body(4200, 1),
    });
    const second = await app.inject({
      method: "POST",
      url: `/api/v1/profiles/${profileId}/page-completions`,
      headers: { ...CLIENT_HEADER, cookie },
      payload: body(99_999, 999),
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);

    const rows = await db.select().from(pageCompletions).where(eq(pageCompletions.profileId, profileId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ dwellMs: 4200, helpTaps: 1 });
  });

  it("ten concurrent identical completions produce exactly one row (section 13.2)", async () => {
    const cookie = await startSession(app);
    const profileId = await createProfile(app, cookie);
    const payload = { pageId: "p1", mode: "listen" as const, dwellMs: 4200, helpTaps: 1, starResults: [] };

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        app.inject({
          method: "POST",
          url: `/api/v1/profiles/${profileId}/page-completions`,
          headers: { ...CLIENT_HEADER, cookie },
          payload,
        }),
      ),
    );

    expect(responses.every((r) => r.statusCode === 200)).toBe(true);

    const rows = await db.select().from(pageCompletions).where(eq(pageCompletions.profileId, profileId));
    expect(rows).toHaveLength(1);
  });

  it("treats different pages, and different modes on the same page, as separate completions", async () => {
    const cookie = await startSession(app);
    const profileId = await createProfile(app, cookie);

    await app.inject({
      method: "POST",
      url: `/api/v1/profiles/${profileId}/page-completions`,
      headers: { ...CLIENT_HEADER, cookie },
      payload: { pageId: "p1", mode: "listen", dwellMs: 100, helpTaps: 0, starResults: [] },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/profiles/${profileId}/page-completions`,
      headers: { ...CLIENT_HEADER, cookie },
      payload: { pageId: "p1", mode: "together", dwellMs: 100, helpTaps: 0, starResults: [] },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/profiles/${profileId}/page-completions`,
      headers: { ...CLIENT_HEADER, cookie },
      payload: { pageId: "p2", mode: "listen", dwellMs: 100, helpTaps: 0, starResults: [] },
    });

    const rows = await db.select().from(pageCompletions).where(eq(pageCompletions.profileId, profileId));
    expect(rows).toHaveLength(3);
  });

  it("404s when the profile belongs to a different family, not the requester's", async () => {
    const ownerCookie = await startSession(app);
    const profileId = await createProfile(app, ownerCookie);

    const attackerCookie = await startSession(app);
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/profiles/${profileId}/page-completions`,
      headers: { ...CLIENT_HEADER, cookie: attackerCookie },
      payload: { pageId: "p1", mode: "listen", dwellMs: 100, helpTaps: 0, starResults: [] },
    });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body.code).toBe("profile_not_found");
    expect(typeof body.requestId).toBe("string");
  });

  it("404s for a profile id that doesn't exist at all", async () => {
    const cookie = await startSession(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/profiles/00000000-0000-0000-0000-000000000000/page-completions",
      headers: { ...CLIENT_HEADER, cookie },
      payload: { pageId: "p1", mode: "listen", dwellMs: 100, helpTaps: 0, starResults: [] },
    });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.json().code).toBe("profile_not_found");
  });
});
