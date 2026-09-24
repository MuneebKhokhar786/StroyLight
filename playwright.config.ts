import { defineConfig, devices } from "@playwright/test";

/**
 * Section 13.3: WebKit iPad Pro 11 landscape, WebKit portrait, Chromium
 * desktop. Every project runs AI_MODE=fake — the fixture story never has
 * real audio anyway, so the reader always drives the SimulatedPlayer path.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "iPad landscape",
      use: { ...devices["iPad Pro 11 landscape"] },
    },
    {
      name: "iPad portrait",
      use: { ...devices["iPad Pro 11"] },
    },
    {
      name: "desktop chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      // No .env file needed here: DATABASE_URL comes from the environment
      // (docker-compose's default locally, whatever CI's postgres service
      // exposes there), same as any other way of running the API.
      command: "pnpm --filter @storylight/api exec tsx src/server.ts",
      url: "http://localhost:3000/readyz",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? "postgres://storylight:storylight@localhost:5432/storylight",
        AI_MODE: "fake",
        PORT: "3000",
      },
    },
    {
      command: "pnpm --filter @storylight/web run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
