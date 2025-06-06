import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scripts = pgTable("scripts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  status: text("status").notNull().default("active"), // active, testing, archived
  timeframe: text("timeframe"),
  tradingPair: text("trading_pair"),
  tags: text("tags").array(),
  performanceNotes: text("performance_notes"),
  performance: text("performance"), // e.g. "+12.5%"
  performanceValue: integer("performance_value"), // numerical value for sorting
  fileSize: text("file_size"),
  createdAt: timestamp("created_at").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
});

export const scriptVersions = pgTable("script_versions", {
  id: serial("id").primaryKey(),
  scriptId: integer("script_id").notNull(),
  version: text("version").notNull(),
  content: text("content").notNull(),
  description: text("description"),
  additions: integer("additions").default(0),
  deletions: integer("deletions").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScriptSchema = createInsertSchema(scripts).omit({
  id: true,
  createdAt: true,
  lastModified: true,
});

export const insertScriptVersionSchema = createInsertSchema(scriptVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertScript = z.infer<typeof insertScriptSchema>;
export type Script = typeof scripts.$inferSelect;
export type InsertScriptVersion = z.infer<typeof insertScriptVersionSchema>;
export type ScriptVersion = typeof scriptVersions.$inferSelect;
