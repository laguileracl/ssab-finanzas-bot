import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for web dashboard access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // 'admin', 'manager', 'user'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Telegram users table
export const telegramUsers = pgTable("telegram_users", {
  id: serial("id").primaryKey(),
  telegramId: varchar("telegram_id").unique().notNull(),
  username: varchar("username"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role").notNull().default("requester"), // 'requester', 'finance_team', 'manager'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Predefined ticket templates
export const ticketTemplates = pgTable("ticket_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // 'payment', 'invoice', 'budget', 'expense', 'other'
  requiredFields: jsonb("required_fields").$type<string[]>().default([]),
  estimatedTime: integer("estimated_time_hours"),
  priority: varchar("priority").notNull().default("medium"), // 'low', 'medium', 'high', 'urgent'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tickets table
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => ticketTemplates.id),
  title: varchar("title").notNull(),
  description: text("description"),
  category: varchar("category").notNull(),
  priority: varchar("priority").notNull().default("medium"),
  status: varchar("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'cancelled'
  requesterId: integer("requester_id").references(() => telegramUsers.id),
  assigneeId: integer("assignee_id").references(() => telegramUsers.id),
  requestData: jsonb("request_data").$type<Record<string, any>>().default({}),
  response: text("response"),
  estimatedTime: integer("estimated_time_hours"),
  actualTime: integer("actual_time_hours"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ticket comments/updates
export const ticketComments = pgTable("ticket_comments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id),
  userId: integer("user_id").references(() => telegramUsers.id),
  comment: text("comment").notNull(),
  isInternal: boolean("is_internal").default(false), // Internal comments not visible to requester
  createdAt: timestamp("created_at").defaultNow(),
});

// Telegram message log for tracking bot interactions
export const telegramMessages = pgTable("telegram_messages", {
  id: serial("id").primaryKey(),
  telegramId: varchar("telegram_id").notNull(),
  messageId: varchar("message_id"),
  ticketId: integer("ticket_id").references(() => tickets.id),
  messageType: varchar("message_type").notNull(), // 'request', 'notification', 'update', 'completion'
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertTelegramUserSchema = createInsertSchema(telegramUsers).omit({
  id: true,
  createdAt: true,
});

export const insertTicketTemplateSchema = createInsertSchema(ticketTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketCommentSchema = createInsertSchema(ticketComments).omit({
  id: true,
  createdAt: true,
});

export const insertTelegramMessageSchema = createInsertSchema(telegramMessages).omit({
  id: true,
  createdAt: true,
});

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type TelegramUser = typeof telegramUsers.$inferSelect;
export type InsertTelegramUser = z.infer<typeof insertTelegramUserSchema>;
export type TicketTemplate = typeof ticketTemplates.$inferSelect;
export type InsertTicketTemplate = z.infer<typeof insertTicketTemplateSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type TicketComment = typeof ticketComments.$inferSelect;
export type InsertTicketComment = z.infer<typeof insertTicketCommentSchema>;
export type TelegramMessage = typeof telegramMessages.$inferSelect;
export type InsertTelegramMessage = z.infer<typeof insertTelegramMessageSchema>;