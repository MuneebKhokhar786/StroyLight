# Architecture

A Vite React SPA and a Fastify API on one origin, one Postgres, one background
worker — nothing the demo doesn't need. See ADRs 0001–0003 for the reasoning.

```
iPad Safari
  ├─ "/"        → Static SPA (CDN, immutable)
  └─ "/api/v1"  → Fastify API → Postgres
                              → pg-boss worker → Claude / image provider / ElevenLabs → AssetStore (R2)
```

API and worker share one process in dev and run as two commands from one image in
production. Same-origin is not cosmetic — see ADR 0003.

## Repository layout

See `CLAUDE.md` for the day-to-day conventions, and the root `package.json` scripts.
The full target layout (populated across the phased execution plan):

```
apps/web/src/       app, features (onboarding, library, reader, minigames, rewards,
                     treehouse, generation, parent, internal), lib, ui
apps/api/src/       server, worker, config, db, http, domain, pipeline, assets
packages/shared/src contracts, reader, minigames, analytics, flags
worlds/              world packs (data, not code)
evals/               eval briefs and harness
e2e/                 Playwright specs
scripts/             wt-setup, seed, econ-sim, generate-originals, avatar-grid
docs/                architecture, decisions, privacy, ethics-review, metrics,
                     economy, performance, evals, demo-script, agent-log
```

## Current status

Phase 0 (walking skeleton): `/healthz`, `/readyz`, an anonymous session endpoint
backed by a hashed-token cookie, and the landing page. Reader Mode, the AI
pipeline, the economy and instrumentation land in the phases that follow — see the
phased execution plan for exit criteria per phase.
