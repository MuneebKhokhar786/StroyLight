import type { FastifyError, FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { randomUUID } from "node:crypto";

/**
 * RFC 9457 problem+json errors, everywhere. Never leak a stack trace, a SQL
 * fragment or a provider name to a client — see docs/decisions and section 12.
 */
export class ProblemError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Wrapped with fastify-plugin: setErrorHandler and setNotFoundHandler
 * registered inside an unwrapped plugin only apply within that plugin's own
 * encapsulation context, not to sibling-registered routes. Unwrapped, this
 * handler silently never ran for stories/profiles/page-completions — every
 * error fell through to Fastify's raw default JSON shape (no requestId, no
 * problem+json content type), which happened to share just enough fields
 * with our shape (status, code) that a shallow test wouldn't have noticed.
 */
export const errorsPlugin = fp(async function errorsPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | ProblemError, request, reply) => {
    const requestId = randomUUID();

    if (error instanceof ProblemError) {
      request.log.error(
        { err: error, requestId, status: error.status, code: error.code },
        "request failed",
      );
      reply
        .status(error.status)
        .type("application/problem+json")
        .send({
          type: `https://storylight.dev/problems/${error.code}`,
          title: error.message,
          status: error.status,
          code: error.code,
          requestId,
        });
      return;
    }

    const status = error.statusCode ?? 500;
    // A schema-validation failure (zod, via fastify-type-provider-zod) is
    // about the client's own request shape — safe to echo back and genuinely
    // useful — unlike a 500, which could be an unhandled DB/driver error and
    // must never leak internals to the client.
    const isValidationError = status === 400 && (error.code === "FST_ERR_VALIDATION" || Array.isArray(error.validation));
    const code = isValidationError ? "validation_error" : status === 500 ? "internal_error" : "bad_request";
    const title = isValidationError ? error.message : status === 500 ? "Something went wrong." : "Bad request.";

    request.log.error({ err: error, requestId, status, code }, "request failed");

    reply
      .status(status)
      .type("application/problem+json")
      .send({
        type: `https://storylight.dev/problems/${code}`,
        title,
        status,
        code,
        requestId,
      });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).type("application/problem+json").send({
      type: "https://storylight.dev/problems/not_found",
      title: "Not found.",
      status: 404,
      code: "not_found",
      requestId: randomUUID(),
    });
  });
});
