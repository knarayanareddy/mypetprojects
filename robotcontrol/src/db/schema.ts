import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Server-side backup of the deck's browser state: per-arm calibration (LeRobot JSON), camera homography,
// settings and run history – so a new browser profile / PC does not lose a calibration.
export const deckState = pgTable("deck_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
