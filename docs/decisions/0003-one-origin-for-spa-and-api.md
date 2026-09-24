# 0003: One origin for SPA and API

## Status
Accepted

## Context
The session is an HttpOnly, Secure, SameSite=Lax cookie. Safari blocks third-party
cookies by default — an API on a separate domain (or even a separate subdomain
without care) can silently break the session on the device this product targets.

## Decision
Fastify serves both the built SPA (as static assets) and `/api/v1/*` from one
origin. A CDN in front caches only hashed, immutable static assets; API responses
are never cached.

## Consequences
- No CORS configuration needed for the app itself.
- Cookie-based sessions work reliably on iPad Safari without SameSite gymnastics.
- Deploys couple the API and the SPA build to one release step (acceptable at this scale).

## Rejected
A separate API domain (e.g. `api.storylight.dev` in front of a `storylight.dev`
SPA) — technically workable with the right cookie domain, but adds a real failure
mode (silently broken sessions in Safari) for no benefit at this scale.
