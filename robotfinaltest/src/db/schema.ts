import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Key/value backup of the control-room state (calibration, missions, models...). */
export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
