# 0014: The session cookie's Secure flag follows the request's protocol

## Status
Accepted

## Context
The session cookie needs `Secure` in production — it carries a bearer token
and same-origin alone isn't enough. But the Phase 1 WebKit E2E projects (iPad
Pro 11 landscape and portrait) failed at the very first step: bootstrapping a
session silently produced no cookie, so every subsequent authenticated
request 401'd.

Unlike Chromium, WebKit/Safari does not treat `http://localhost` as a secure
context for the purposes of the `Secure` cookie attribute — it requires an
actual TLS connection. `secure: true` unconditionally works fine in Chromium
(and in production, which is HTTPS) but silently drops the cookie on Safari
during local development, over plain HTTP.

## Decision
Set `secure: request.protocol === "https"` when issuing the session cookie,
instead of a hardcoded `true`. In production, behind TLS, this is `secure:
true` exactly as before. In local dev over HTTP, it's `secure: false`, which
Safari accepts.

## Consequences
- iPad Safari (the actual target device) now gets a session in local dev,
  which is what let the WebKit Playwright projects pass at all.
- No behavior change in production — the deploy target is always HTTPS.
- Caught by testing against real WebKit rather than only Chromium; this is
  the concrete reason section 13.3 insists on a WebKit project, not just
  Chromium for E2E speed.
