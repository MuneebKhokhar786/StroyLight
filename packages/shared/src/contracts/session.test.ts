import { describe, expect, it } from "vitest";
import { SessionResponse } from "./session.js";

describe("SessionResponse", () => {
  it("accepts a valid family id", () => {
    const result = SessionResponse.safeParse({ familyId: "3fa85f64-5717-4562-b3fc-2c963f66afa6" });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid family id", () => {
    const result = SessionResponse.safeParse({ familyId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
