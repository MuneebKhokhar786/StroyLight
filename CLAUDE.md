# Storylight

Reader Mode, in-story play, a server-authoritative economy, a gated AI pipeline and
retention instrumentation — the slice of a co-creation reading product, built as an
interview demo. Full plan: the technical action plan this repo implements (kept
outside the repo; see docs/architecture.md for the summary that matters day to day).

## Commands

- `pnpm i && pnpm dev` — installs and starts the web app + API with `AI_MODE=fake` (no keys needed).
- `pnpm run verify:quick` — lint + typecheck + unit tests. Run this before every commit; it's also the Stop hook.
- `pnpm run test` — full test suite for every package.
- `pnpm run build` — production build of every package.
- `pnpm wt:setup` — derives a per-worktree port and Postgres database from the worktree name.

## Conventions

- The client never computes rewards, star-word validity or minigame outcomes — the server is authoritative. See docs/decisions/0004-natural-key-idempotency.md.
- API types come from one place: `packages/shared/src/contracts`. Change them only from the lead session, in small PRs — lanes rebase after each merge.
- Every table with money-like semantics (the ledger, completions) uses a natural-key idempotency key, never a random token.
- `AI_MODE` is `fake` everywhere except the lead's recording runs and the hosted demo. Tests never call real providers.
- No child-facing input is free text. Every child input is a curated choice — see docs/decisions/0006-curated-only-child-input.md.
- Secrets are server-side only, validated at boot in `apps/api/src/config/env.ts`. Claude Code must never read `.env*`.

## Definition of done

Tests added; CI gates green; runs on the iPad for UI work; loading/empty/error states
handled; an analytics event added for anything user-facing; an ADR written if a
decision was made. See docs/decisions/ for the format.

## Agent operating model

One lead session (this checkout) plus lane sessions in isolated worktrees:
`claude --worktree reader`, `claude --worktree pipeline`, `claude --worktree economy`,
`claude --worktree qa`. Contracts, migrations, the lockfile and merges are the lead's
job. `.worktreeinclude` copies `.env` (fake mode only) into each new worktree; live
keys live only in the lead's `.env.live`, never copied. Keep `docs/agent-log.md`
from day one — collisions are portfolio material, not just friction.
