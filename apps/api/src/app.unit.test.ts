import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";

describe("GET /healthz", () => {
  it("returns ok without touching the database", async () => {
    const env = loadEnv({ DATABASE_URL: "postgres://unused", NODE_ENV: "test" });
    const app = buildApp(env);

    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });

    await app.close();
  });
});

describe("unknown routes", () => {
  it("return an RFC 9457 problem+json 404", async () => {
    const env = loadEnv({ DATABASE_URL: "postgres://unused", NODE_ENV: "test" });
    const app = buildApp(env);

    const response = await app.inject({ method: "GET", url: "/nope" });

    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.json().code).toBe("not_found");

    await app.close();
  });
});
