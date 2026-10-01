import { jsonb, pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

/** Models the user has registered (HF repo / local checkpoint / HTTP endpoint). */
export const robotModels = pgTable("robot_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** act | diffusion | smolvla | pi0 | pi05 | groot | molmoact2 | custom */
  family: text("family").notNull().default("custom"),
  /** "hf" (policy server loads a hub repo) | "local" (checkpoint path on server) | "http" (any endpoint) */
  source: text("source").notNull().default("hf"),
  /** HF repo id, local path or full URL depending on `source` */
  location: text("location").notNull(),
  endpoint: text("endpoint").notNull().default("http://localhost:8787"),
  instruction: text("instruction").notNull().default(""),
  notes: text("notes").notNull().default(""),
  languageConditioned: boolean("language_conditioned").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Log of every task run from the Control Center / Playground. */
export const taskRuns = pgTable("task_runs", {
  id: serial("id").primaryKey(),
  instruction: text("instruction").notNull(),
  scenarioId: text("scenario_id").notNull().default(""),
  modelName: text("model_name").notNull().default("Scripted IK skill"),
  mode: text("mode").notNull().default("sim"),
  outcome: text("outcome").notNull().default("completed"),
  metrics: jsonb("metrics").$type<Record<string, number | string>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Recorded joint-space trajectories (teleop recordings) saved as reusable skills. */
export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  arm: text("arm").notNull().default("a"),
  fps: integer("fps").notNull().default(30),
  frames: jsonb("frames").$type<number[][]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
