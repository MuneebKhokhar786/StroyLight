import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { loadEnv } from "../../config/env.js";

// These routes' family-ownership check happens before any DB call for the
// profile/page itself runs, so we can verify the 401 gate without a live
// Postgres. The DB-backed behavior behind it (idempotent completions,
// cross-family 404) is covered by an integration test once Testcontainers
// Postgres is available — see section 13.2.
describe("requireFamily gate", () => {
  const env = loadEnv({ DATABASE_URL: "postgres://unused", NODE_ENV: "test" });

  it("rejects a profile creation with no session cookie", async () => {
    const app = buildApp(env);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/profiles",
      headers: { "x-storylight-client": "web" },
      payload: { heroNameId: "aria", avatarComboId: "combo-1", pronouns: "she/her", ageBand: "5-6" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("no_session");
    await app.close();
  });

  it("rejects a page completion with no session cookie", async () => {
    const app = buildApp(env);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/profiles/3fa85f64-5717-4562-b3fc-2c963f66afa6/page-completions",
      headers: { "x-storylight-client": "web" },
      payload: { pageId: "moonlit-forest-01-p1", mode: "listen", dwellMs: 1000, helpTaps: 0 },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("no_session");
    await app.close();
  });
});

describe("CSRF header gate", () => {
  const env = loadEnv({ DATABASE_URL: "postgres://unused", NODE_ENV: "test" });

  it("rejects a mutation with no client header, even before checking the session", async () => {
    const app = buildApp(env);
    const response = await app.inject({ method: "POST", url: "/api/v1/session" });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("missing_client_header");
    await app.close();
  });

  it("never blocks a safe GET request", async () => {
    const app = buildApp(env);
    const response = await app.inject({ method: "GET", url: "/api/v1/stories/moonlit-forest-01" });

    expect(response.statusCode).toBe(200);
    await app.close();
  });
});
