# 0002: Postgres as the only datastore; pg-boss for jobs

## Status
Accepted

## Context
The economy ledger and reading progress need real transactions and constraints, not
eventual consistency. Background jobs (story generation stages) need durable
retries and priority, but the demo shouldn't need a second infrastructure
dependency to run locally with zero setup beyond one `docker compose up`.

## Decision
PostgreSQL via Drizzle, with SQL migrations committed to the repo. Background jobs
run on `pg-boss`, which is itself backed by the same Postgres instance.

## Consequences
- One datastore to provision, back up and reason about, in dev and in production.
- Job durability and retries come from the database's own guarantees.
- Throughput ceiling is lower than a dedicated queue (Redis/BullMQ) at very high
  volume — acceptable for a demo with a handful of families generating a handful
  of stories.

## Rejected
- Prisma: heavier runtime, less direct SQL control than we want for the ledger.
- Document stores: the domain is relational (ledger, completions, cross-table
  cascading deletes for privacy) — a document model fights the constraints we need.
- BullMQ + Redis: a second infrastructure dependency this project doesn't need.
