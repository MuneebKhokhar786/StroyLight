import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";

/**
 * Vitest globalSetup for integration tests (section 13.2). Spins up a real,
 * disposable Postgres via Testcontainers and runs the committed migrations
 * against it — no docker-compose, no manual setup. If DATABASE_URL is
 * already set (a CI service container, or a locally running instance a
 * developer pointed the run at), this defers to it instead of starting a
 * second one; either way the tests below run against a real Postgres, not
 * a mock.
 */
export default async function setup() {
  if (process.env.DATABASE_URL) {
    return;
  }

  let container: StartedPostgreSqlContainer;
  try {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
  } catch (err) {
    throw new Error(
      "Integration tests need a Postgres: either Docker running (for Testcontainers) " +
        "or a DATABASE_URL pointing at one already running.",
      { cause: err },
    );
  }

  process.env.DATABASE_URL = container.getConnectionUri();

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("./migrations", import.meta.url)) });
  await pool.end();

  return async () => {
    await container.stop();
  };
}
