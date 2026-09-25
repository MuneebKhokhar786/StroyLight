import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { ProblemError } from "./errors.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CLIENT_HEADER = "x-storylight-client";

/**
 * SameSite=Lax stops cross-site cookie-riding form POSTs in modern browsers,
 * but it's not the only line of defense (older browsers, edge cases) —
 * section 12 asks for a required JSON content type plus a custom header on
 * mutations too. A plain HTML form can't set either: forms only send
 * `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`,
 * and can't add arbitrary headers. Fastify's own JSON body parser already
 * enforces the content-type; this hook adds the header check for every
 * mutating request under /api/v1.
 *
 * Wrapped with fastify-plugin, like sessionPlugin, so the hook attaches at
 * the root instance and actually reaches routes registered as siblings —
 * an onRequest hook added inside an unwrapped plugin is scoped to that
 * plugin's own encapsulation context and never sees them.
 */
export const csrfPlugin = fp(async function csrfPlugin(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    if (SAFE_METHODS.has(request.method)) return;
    if (!request.url.startsWith("/api/v1")) return;

    if (!request.headers[CLIENT_HEADER]) {
      throw new ProblemError(403, "missing_client_header", "Missing required client header.");
    }
  });
});
