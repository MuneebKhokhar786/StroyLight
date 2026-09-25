# Storylight

A child co-creates a story where they're the hero, then gradually takes over the
reading. Everything around that — the in-story game, the server-authoritative
economy, the AI pipeline's safety gates, the retention instrumentation — exists to
make that crossing happen, without dark patterns.

This is an interview demo, not the shipped product. It builds the slice of a
co-creation reading app one engineering role would own, as one coherent product,
rather than another story generator.

## Try it

- Hosted: _link goes here once Phase 0 deploys._
- Local, zero API keys: `pnpm i && pnpm dev` (starts with `AI_MODE=fake`).

## Environment variables and AI modes

See `.env.example`. `AI_MODE` is one of:

- `live` — real providers, budget-capped. Used for the hosted demo only.
- `recorded` — replays a captured real run; the UI says so. Used when no keys are configured.
- `fake` — deterministic fixtures with injectable failures. Used by every test and every agent worktree.

## Tests

- `pnpm run test:unit` — unit tests, no external services.
- `pnpm --filter @storylight/api run test:integration` — real Postgres behavior (idempotency under concurrency, cross-family authorization, RFC 9457 error shapes). Needs Docker running locally (spins up its own disposable Postgres via Testcontainers) or a `DATABASE_URL` already pointing at one, already migrated.
- `pnpm run test` — the full suite (unit + integration) for every package.
- `pnpm run test:e2e` — Playwright, against WebKit (iPad Pro 11, portrait and landscape) and Chromium desktop, including axe accessibility checks and a keyboard-only pass. Needs a running, migrated Postgres (`docker compose up -d`, then `pnpm --filter @storylight/api exec drizzle-kit migrate`); starts both dev servers itself.
- `pnpm run verify:quick` — lint + typecheck + unit; run before every commit.

## Architecture

See [docs/architecture.md](docs/architecture.md) and [docs/decisions/](docs/decisions/) for why, not just what.

## Real vs. simulated

Real: Claude, image and TTS provider calls (in `live`/`recorded` mode), Postgres,
the economy ledger, analytics events. Simulated: parental consent (a tap-and-hold
gate, not verifiable consent), no payments, no multi-device sync.

## Known limitations

This is Phase 0 — a walking skeleton. Reader Mode, the AI pipeline, the economy and
instrumentation land in the phases that follow; see the phased execution plan.

## What production would add

Verifiable parental consent, a written information security program, vendor DPAs
and zero-retention agreements, a data warehouse, and on-device speech recognition
research (voice never leaves the device, if it's used at all).
