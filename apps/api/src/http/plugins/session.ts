import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fp from "fastify-plugin";
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { families, sessions } from "../../db/schema.js";
import type { Db } from "../../db/client.js";
import { ProblemError } from "./errors.js";

const COOKIE_NAME = "sl_session";
const SESSION_TTL_DAYS = 30;

declare module "fastify" {
  interface FastifyRequest {
    familyId: string | null;
  }
  interface FastifyInstance {
    requireFamily(request: FastifyRequest, reply: FastifyReply): Promise<void>;
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

async function resolveFamilyId(db: Db, request: FastifyRequest): Promise<string | null> {
  const token = request.cookies[COOKIE_NAME];
  if (!token) return null;

  const tokenHash = hashToken(token);
  const [row] = await db
    .select({ familyId: sessions.familyId, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!row || row.expiresAt.getTime() <= Date.now()) return null;
  return row.familyId;
}

/**
 * Same-origin, HttpOnly cookie session. Anonymous by design (no accounts —
 * see ADR-0006 and section 16 "Won't"). Wrapped with fastify-plugin so
 * `requireFamily` and the `familyId` request decoration are visible to
 * every sibling route plugin, not just children registered inside this one.
 */
export const sessionPlugin = fp(async function sessionPlugin(app: FastifyInstance, opts: { db: Db }) {
  await app.register(fastifyCookie);

  app.decorateRequest("familyId", null);

  app.decorate("requireFamily", async function requireFamily(request: FastifyRequest) {
    const familyId = await resolveFamilyId(opts.db, request);
    if (!familyId) {
      throw new ProblemError(401, "no_session", "No active session.");
    }
    request.familyId = familyId;
  });

  app.post("/api/v1/session", async (request, reply) => {
    const familyId = await resumeOrCreateFamily(opts.db, request, reply);
    return { familyId };
  });
});
