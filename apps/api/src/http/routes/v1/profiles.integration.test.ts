import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../app.js";
import { loadEnv } from "../../../config/env.js";
import { createDb, type Db } from "../../../db/client.js";
import type { FastifyInstance } from "fastify";

const CLIENT_HEADER = { "x-storylight-client": "integration-test" };
const VALID_PROFILE = { heroNameId: "nora", avatarComboId: "default", pronouns: "she/her", ageBand: "5-6" };

async function startSession(app: FastifyInstance): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/api/v1/session", headers: CLIENT_HEADER });
  const setCookie = res.headers["set-cookie"];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) throw new Error("no session cookie returned");
  return raw.split(";")[0]!;
}

describe("profiles (integration)", () => {
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

  it("creates a profile scoped to the caller's own family", async () => {
    const cookie = await startSession(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/profiles",
      headers: { ...CLIENT_HEADER, cookie },
      payload: VALID_PROFILE,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject(VALID_PROFILE);
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects an invalid ageBand with a clean problem+json 400, not a stack trace", async () => {
    const cookie = await startSession(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/profiles",
      headers: { ...CLIENT_HEADER, cookie },
      payload: { ...VALID_PROFILE, ageBand: "12-13" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body).toMatchObject({ status: 400, code: "validation_error" });
    expect(typeof body.requestId).toBe("string");
    expect(body).not.toHaveProperty("stack");
    expect(JSON.stringify(body)).not.toMatch(/at Object|at async|node_modules/);
  });

  it("rejects a heroNameId that isn't a curated slug (ADR-0006: no free text from children)", async () => {
    const cookie = await startSession(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/profiles",
      headers: { ...CLIENT_HEADER, cookie },
      payload: { ...VALID_PROFILE, heroNameId: "<script>alert(1)</script>" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects a heroNameId longer than the curated-catalog bound", async () => {
    const cookie = await startSession(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/profiles",
      headers: { ...CLIENT_HEADER, cookie },
      payload: { ...VALID_PROFILE, heroNameId: "a".repeat(65) },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects pronouns outside the curated set", async () => {
    const cookie = await startSession(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/profiles",
      headers: { ...CLIENT_HEADER, cookie },
      payload: { ...VALID_PROFILE, pronouns: "whatever I type" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("gives two different sessions two different families", async () => {
    const cookieA = await startSession(app);
    const cookieB = await startSession(app);

    const resA = await app.inject({ method: "POST", url: "/api/v1/session", headers: { ...CLIENT_HEADER, cookie: cookieA } });
    const resB = await app.inject({ method: "POST", url: "/api/v1/session", headers: { ...CLIENT_HEADER, cookie: cookieB } });

    expect(resA.json().familyId).not.toBe(resB.json().familyId);
  });
});
