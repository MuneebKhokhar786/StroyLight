#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import { basename } from "node:path";

/**
 * Derives a per-worktree port and database from the worktree's directory name
 * (.claude/worktrees/<lane>/) so lane sessions never collide on a shared
 * dev server port or a shared dev database. See CLAUDE.md and section 15.2.
 */
function laneNameFromCwd(): string {
  const dir = basename(process.cwd());
  return dir === "storylight" ? "lead" : dir;
}

function hashPort(lane: string): number {
  let hash = 0;
  for (const ch of lane) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return 3100 + (hash % 800); // 3100-3899, clear of the lead's 3000
}

const lane = laneNameFromCwd();
const port = lane === "lead" ? 3000 : hashPort(lane);
const dbName = `storylight_${lane}`;

console.log(`[wt:setup] lane=${lane} port=${port} db=${dbName}`);

execSync(
  `psql "postgres://storylight:storylight@localhost:5432/postgres" -c "CREATE DATABASE ${dbName}" || true`,
  { stdio: "inherit" },
);

console.log(`[wt:setup] set PORT=${port} DATABASE_URL=postgres://storylight:storylight@localhost:5432/${dbName} in this worktree's .env`);
