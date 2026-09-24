import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";
import type { Env } from "../config/env.js";

export type Db = ReturnType<typeof createDb>;

export function createDb(env: Env) {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  return drizzle(pool, { schema });
}
