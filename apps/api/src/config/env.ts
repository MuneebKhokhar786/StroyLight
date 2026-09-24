import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AI_MODE: z.enum(["live", "recorded", "fake"]).default("fake"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  IMAGE_PROVIDER_API_KEY: z.string().optional(),
  ASSET_STORE: z.enum(["local", "s3"]).default("local"),
  DAILY_AI_BUDGET_USD: z.coerce.number().nonnegative().default(10),
  INTERNAL_BASIC_AUTH_USER: z.string().default("admin"),
  INTERNAL_BASIC_AUTH_PASS: z.string().default("change-me"),
});

export type Env = z.infer<typeof EnvSchema>;

// Fail fast: a misconfigured deploy should never boot half-alive. Callers of
// process.exit in tests mock it to keep running, so every failure path
// returns right after — real Node exits immediately and never reaches it.
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
    return undefined as unknown as Env;
  }
  if (result.data.AI_MODE === "live" && !result.data.ANTHROPIC_API_KEY) {
    console.error("AI_MODE=live requires ANTHROPIC_API_KEY");
    process.exit(1);
    return undefined as unknown as Env;
  }
  return result.data;
}
