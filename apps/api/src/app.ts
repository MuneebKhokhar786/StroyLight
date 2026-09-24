import Fastify from "fastify";
import helmet from "@fastify/helmet";
import { sql } from "drizzle-orm";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import type { Env } from "./config/env.js";
import { errorsPlugin } from "./http/plugins/errors.js";
import { sessionPlugin } from "./http/plugins/session.js";
import { storiesRoutes } from "./http/routes/v1/stories.js";
import { profilesRoutes } from "./http/routes/v1/profiles.js";
import { pageCompletionsRoutes } from "./http/routes/v1/page-completions.js";
import { createDb, type Db } from "./db/client.js";

export function buildApp(env: Env, db: Db = createDb(env)) {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      redact: ["req.headers.cookie", "req.headers.authorization"],
    },
  });

  // Schema-first routes (section 2.1): every route below validates its
  // input and serializes its output from the same zod schemas the client
  // types come from.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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
  app.register(storiesRoutes);
  app.register(profilesRoutes, { db });
  app.register(pageCompletionsRoutes, { db });

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
