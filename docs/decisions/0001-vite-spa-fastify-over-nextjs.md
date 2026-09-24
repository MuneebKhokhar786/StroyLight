# 0001: Vite React SPA + Fastify over Next.js

## Status
Accepted

## Context
The child surface is interaction-heavy, sits behind a profile picker, and needs no
SEO. Story generation is a long-running background job, not a request/response
cycle — it doesn't fit a serverless function model well.

## Decision
Client: React + TypeScript on Vite, as an SPA with route-level code splitting.
Server: Node + Fastify, with zod-typed routes via `fastify-type-provider-zod`.

## Consequences
- No server-side rendering to reason about; simpler mental model for a solo build.
- We own routing, auth and caching decisions explicitly rather than inheriting a framework's.
- Long AI jobs are naturally modeled as `202 Accepted` + polling, not a request that times out.

## Rejected
Next.js — SSR buys nothing for a picker-gated, non-indexed app, and its request
model doesn't fit multi-minute generation jobs.
