import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("Untitled atlas"),
  // draft -> distilled
  status: text("status").notNull().default("draft"),
  uiLang: text("ui_lang").notNull().default("en"),
  readingGoal: text("reading_goal").notNull().default(""),
  engine: text("engine").notNull().default("auto"),
  model: jsonb("model"),
  factcheck: jsonb("factcheck"),
  validation: jsonb("validation"),
  log: jsonb("log"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  fileId: text("file_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull().default(0),
  sha256: text("sha256").notNull(),
  pages: integer("pages"),
  words: integer("words").notNull().default(0),
  // Markdown intermediate layer (with page anchors) – the "content.md"
  contentMd: text("content_md").notNull(),
  // Extracted images (base64) – the "assets/"
  assets: jsonb("assets"),
  // The "meta.json": headings, tables, warnings, date, unit labels...
  meta: jsonb("meta"),
  included: boolean("included").notNull().default(true),
  cached: boolean("cached").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
