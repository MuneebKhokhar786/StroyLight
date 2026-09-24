import Fastify from "fastify";
import helmet from "@fastify/helmet";
import { sql } from "drizzle-orm";
import type { Env } from "./config/env.js";
import { errorsPlugin } from "./http/plugins/errors.js";
import { sessionPlugin } from "./http/plugins/session.js";
import { createDb, type Db } from "./db/client.js";

export function buildApp(env: Env, db: Db = createDb(env)) {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      redact: ["req.headers.cookie", "req.headers.authorization"],
    },
  });

  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "blob:", "data:"],
        mediaSrc: ["'self'", "blob:"],
        scriptSrc: ["'self'"],
      },
    },
  });

  app.register(errorsPlugin);
  app.register(sessionPlugin, { db });

  app.get("/healthz", async () => ({ status: "ok" }));

  app.get("/readyz", async (_request, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { status: "ready" };
    } catch (err) {
      app.log.error({ err }, "readiness check failed");
      return reply.status(503).send({ status: "not_ready" });
    }
  });

  return app;
}
