import { loadEnv } from "./config/env.js";

// pg-boss job processing (story.write, page.illustrate, page.narrate, ...)
// lands in Phase 2 with the AI pipeline. This stub exists so `pnpm dev`
// can start both processes from day one, per the repo layout in section 2.4.
const env = loadEnv();
console.log(`storylight worker starting (AI_MODE=${env.AI_MODE}) — no queues registered yet`);
