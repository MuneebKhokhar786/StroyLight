import { describe, expect, it, vi, afterEach } from "vitest";
import { loadEnv } from "./env.js";

describe("loadEnv", () => {
  const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

  afterEach(() => {
    exitSpy.mockClear();
  });

  it("applies defaults when optional vars are absent", () => {
    const env = loadEnv({ DATABASE_URL: "postgres://x" });
    expect(env.PORT).toBe(3000);
    expect(env.AI_MODE).toBe("fake");
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits when DATABASE_URL is missing", () => {
    loadEnv({});
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when AI_MODE=live has no Anthropic key", () => {
    loadEnv({ DATABASE_URL: "postgres://x", AI_MODE: "live" });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
