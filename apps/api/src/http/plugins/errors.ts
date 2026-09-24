import type { FastifyError, FastifyInstance } from "fastify";
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

export async function errorsPlugin(app: FastifyInstance) {
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
    const code = status === 500 ? "internal_error" : "bad_request";

    request.log.error({ err: error, requestId, status, code }, "request failed");

    reply
      .status(status)
      .type("application/problem+json")
      .send({
        type: `https://storylight.dev/problems/${code}`,
        title: "Something went wrong.",
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
}
