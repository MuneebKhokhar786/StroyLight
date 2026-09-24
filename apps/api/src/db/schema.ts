import { pgTable, uuid, timestamp, text, jsonb, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Phase 0 baseline only: families, sessions, child_profiles. The full domain
 * model (stories, economy, analytics, ...) lands in later phases — see
 * docs/architecture.md section 3 for the target shape.
 */

export const families = pgTable("families", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const childProfiles = pgTable(
  "child_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    heroNameId: text("hero_name_id").notNull(),
    avatarComboId: text("avatar_combo_id").notNull(),
    pronouns: text("pronouns").notNull(),
    ageBand: text("age_band").notNull(),
    readerSettings: jsonb("reader_settings").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "child_profiles_age_band_check",
      sql`${table.ageBand} in ('3-4','5-6','7-8')`,
    ),
  ],
);
