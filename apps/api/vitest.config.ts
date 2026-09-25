import { defineConfig } from "vitest/config";

// Unit tests only — no external services, no globalSetup. Integration
// tests (needing a real Postgres) live in vitest.integration.config.ts.
export default defineConfig({
  test: {
    include: ["src/**/*.unit.test.ts"],
  },
});
