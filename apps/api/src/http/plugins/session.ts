import type { FastifyInstance, FastifyRequest } from "fastify";
import fastifyCookie from "@fastify/cookie";
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { families, sessions } from "../../db/schema.js";
import type { Db } from "../../db/client.js";

const COOKIE_NAME = "sl_session";
const SESSION_TTL_DAYS = 30;

declare module "fastify" {
  interface FastifyRequest {
    familyId: string | null;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function resumeOrCreateFamily(db: Db, request: FastifyRequest, reply: import("fastify").FastifyReply) {
  const existingToken = request.cookies[COOKIE_NAME];

  if (existingToken) {
    const tokenHash = hashToken(existingToken);
    const [row] = await db
      .select({ familyId: sessions.familyId, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1);

    if (row && row.expiresAt.getTime() > Date.now()) {
      await db.update(families).set({ lastSeenAt: new Date() }).where(eq(families.id, row.familyId));
      return row.familyId;
    }
  }

  const [family] = await db.insert(families).values({}).returning({ id: families.id });
  if (!family) {
    throw new Error("failed to create family");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    familyId: family.id,
    expiresAt,
  });

  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return family.id;
}

/**
 * Same-origin, HttpOnly cookie session. Anonymous by design (no accounts —
 * see ADR-0006 and section 16 "Won't"). The preHandler below is what every
 * :profileId route relies on to enforce cross-family authorization.
 */
export async function sessionPlugin(app: FastifyInstance, opts: { db: Db }) {
  await app.register(fastifyCookie);

  app.decorateRequest("familyId", null);

  app.post("/api/v1/session", async (request, reply) => {
    const familyId = await resumeOrCreateFamily(opts.db, request, reply);
    return { familyId };
  });
}
