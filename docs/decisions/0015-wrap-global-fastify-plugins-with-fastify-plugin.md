# 0015: Every plugin that adds a global hook or decorator is wrapped with fastify-plugin

## Status
Accepted

## Context
Three separate times during Phase 1, a plugin registered as a sibling —
`sessionPlugin`'s `requireFamily` decorator, `csrfPlugin`'s CSRF header
check, and `errorsPlugin`'s `setErrorHandler`/`setNotFoundHandler` — silently
didn't apply to the other route plugins (`stories`, `profiles`,
`page-completions`) registered alongside them on the root app instance.

Fastify's default behavior is that `.register()` creates a new encapsulated
child context. A hook, decorator, or error handler added inside that child
is visible only within it and anything nested inside it — never to sibling
contexts registered separately on the parent, and never to the parent
itself. This is normally the *useful* default (it's what lets two unrelated
plugins each register a route called `/status` without colliding), but it's
exactly wrong for cross-cutting concerns that are supposed to apply
everywhere.

The `errorsPlugin` case was the most consequential and the hardest to catch:
every route's errors were silently falling through to Fastify's own default
JSON error shape instead of our RFC 9457 `problem+json` format, but
Fastify's default shape happens to preserve a thrown error's `.code`
property, and our early tests only checked `.statusCode` and `.code` — both
present by coincidence. The bug only surfaced once a test checked the
actual `content-type` header and full body shape, in the integration suite
added in the hardening pass.

## Decision
Any plugin that calls `addHook`, `decorate`, `decorateRequest`,
`setErrorHandler`, or similar app-wide APIs — and is meant to apply
globally, not just to routes it defines itself — is wrapped with
`fastify-plugin` (`fp(...)`). This lets its effects "break out" of its own
encapsulation and attach to the parent instance, reaching every
sibling-registered route. `sessionPlugin`, `csrfPlugin`, and `errorsPlugin`
are all wrapped this way now.

`setNotFoundHandler` was the one exception that worked even unwrapped —
Fastify allows exactly one per app regardless of encapsulation — which is
part of why the other two bugs went unnoticed for as long as they did: the
one cross-cutting mechanism that happened to work masked the ones that
didn't.

## Consequences
- A rule of thumb, not just three isolated fixes: when adding a new plugin
  under `apps/api/src/http/plugins/`, ask whether it's meant to apply
  globally. If yes, wrap it with `fp()`.
- Tests that check an error response now assert `content-type` and the full
  problem+json shape, not just `statusCode`/`code` — those two alone can't
  distinguish "our formatter ran" from "Fastify's default happened to look
  similar."
