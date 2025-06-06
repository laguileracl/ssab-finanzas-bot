import {
  users,
  telegramUsers,
  ticketTemplates,
  tickets,
  ticketComments,
  telegramMessages,
  type User,
  type UpsertUser,
  type TelegramUser,
  type InsertTelegramUser,
  type TicketTemplate,
  type InsertTicketTemplate,
  type Ticket,
  type InsertTicket,
  type TicketComment,
  type InsertTicketComment,
  type TelegramMessage,
  type InsertTelegramMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, count } from "drizzle-orm";

export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Telegram user operations
  getTelegramUser(telegramId: string): Promise<TelegramUser | undefined>;
  createTelegramUser(user: InsertTelegramUser): Promise<TelegramUser>;
  updateTelegramUser(id: number, updates: Partial<InsertTelegramUser>): Promise<TelegramUser | undefined>;
  getTelegramUsersByRole(role: string): Promise<TelegramUser[]>;

  // Ticket template operations
  getTicketTemplates(): Promise<TicketTemplate[]>;
  getTicketTemplate(id: number): Promise<TicketTemplate | undefined>;
  createTicketTemplate(template: InsertTicketTemplate): Promise<TicketTemplate>;
  updateTicketTemplate(id: number, updates: Partial<InsertTicketTemplate>): Promise<TicketTemplate | undefined>;
  deleteTicketTemplate(id: number): Promise<boolean>;

  // Ticket operations
  getTickets(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    assigneeId?: number;
    requesterId?: number;
  }): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<InsertTicket>): Promise<Ticket | undefined>;
  getTicketsByRequester(requesterId: number): Promise<Ticket[]>;
  getTicketsByAssignee(assigneeId: number): Promise<Ticket[]>;

  // Ticket comment operations
  getTicketComments(ticketId: number, includeInternal?: boolean): Promise<TicketComment[]>;
  createTicketComment(comment: InsertTicketComment): Promise<TicketComment>;

  // Telegram message operations
  createTelegramMessage(message: InsertTelegramMessage): Promise<TelegramMessage>;
  getTelegramMessages(telegramId: string, limit?: number): Promise<TelegramMessage[]>;

  // Dashboard analytics
  getTicketStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Telegram user operations
  async getTelegramUser(telegramId: string): Promise<TelegramUser | undefined> {
    const [user] = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, telegramId));
    return user;
  }

  async createTelegramUser(userData: InsertTelegramUser): Promise<TelegramUser> {
    const [user] = await db
      .insert(telegramUsers)
      .values(userData)
      .returning();
    return user;
  }

  async updateTelegramUser(id: number, updates: Partial<InsertTelegramUser>): Promise<TelegramUser | undefined> {
    try {
      // Clean updates to ensure proper type handling
      const cleanUpdates: any = {};
      Object.keys(updates).forEach(key => {
        const value = (updates as any)[key];
        if (value !== undefined) {
          cleanUpdates[key] = value;
        }
      });

      const [user] = await db
        .update(telegramUsers)
        .set(cleanUpdates)
        .where(eq(telegramUsers.id, id))
        .returning();
      return user;
    } catch (error) {
      console.error('Database error updating telegram user:', error);
      throw new Error('Failed to update telegram user in database');
    }
  }

  async getTelegramUsersByRole(role: string): Promise<TelegramUser[]> {
    return await db
      .select()
      .from(telegramUsers)
      .where(and(eq(telegramUsers.role, role), eq(telegramUsers.isActive, true)));
  }

  // Ticket template operations
  async getTicketTemplates(): Promise<TicketTemplate[]> {
    return await db
      .select()
      .from(ticketTemplates)
      .where(eq(ticketTemplates.isActive, true))
      .orderBy(ticketTemplates.name);
  }

  async getTicketTemplate(id: number): Promise<TicketTemplate | undefined> {
    const [template] = await db
      .select()
      .from(ticketTemplates)
      .where(eq(ticketTemplates.id, id));
    return template;
  }

  async createTicketTemplate(templateData: InsertTicketTemplate): Promise<TicketTemplate> {
    try {
      const [template] = await db
        .insert(ticketTemplates)
        .values(templateData)
        .returning();
      return template;
    } catch (error) {
      console.error('Database error creating ticket template:', error);
      throw new Error('Failed to create ticket template in database');
    }
  }

  async updateTicketTemplate(id: number, updates: Partial<InsertTicketTemplate>): Promise<TicketTemplate | undefined> {
    try {
      // Filter out undefined values and ensure proper type handling
      const cleanUpdates: any = {};
      Object.keys(updates).forEach(key => {
        const value = (updates as any)[key];
        if (value !== undefined) {
          cleanUpdates[key] = value;
        }
      });

      const [template] = await db
        .update(ticketTemplates)
        .set(cleanUpdates)
        .where(eq(ticketTemplates.id, id))
        .returning();
      return template;
    } catch (error) {
      console.error('Database error updating ticket template:', error);
      throw new Error('Failed to update ticket template in database');
    }
  }

  async deleteTicketTemplate(id: number): Promise<boolean> {
    const result = await db
      .update(ticketTemplates)
      .set({ isActive: false })
      .where(eq(ticketTemplates.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Ticket operations
  async getTickets(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    assigneeId?: number;
    requesterId?: number;
  }): Promise<Ticket[]> {
    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(tickets.status, filters.status));
      if (filters.priority) conditions.push(eq(tickets.priority, filters.priority));
      if (filters.category) conditions.push(eq(tickets.category, filters.category));
      if (filters.assigneeId) conditions.push(eq(tickets.assigneeId, filters.assigneeId));
      if (filters.requesterId) conditions.push(eq(tickets.requesterId, filters.requesterId));
      
      if (conditions.length > 0) {
        return await db
          .select()
          .from(tickets)
          .where(and(...conditions))
          .orderBy(desc(tickets.createdAt));
      }
    }
    
    return await db
      .select()
      .from(tickets)
      .orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id));
    return ticket;
  }

  async createTicket(ticketData: InsertTicket): Promise<Ticket> {
    const [ticket] = await db
      .insert(tickets)
      .values(ticketData)
      .returning();
    return ticket;
  }

  async updateTicket(id: number, updates: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const updatedData = {
      ...updates,
      updatedAt: new Date(),
    };
    
    if (updates.status === 'completed' && !updates.completedAt) {
      updatedData.completedAt = new Date();
    }
    
    const [ticket] = await db
      .update(tickets)
      .set(updatedData)
      .where(eq(tickets.id, id))
      .returning();
    return ticket;
  }

  async getTicketsByRequester(requesterId: number): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .where(eq(tickets.requesterId, requesterId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicketsByAssignee(assigneeId: number): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .where(eq(tickets.assigneeId, assigneeId))
      .orderBy(desc(tickets.createdAt));
  }

  // Ticket comment operations
  async getTicketComments(ticketId: number, includeInternal = false): Promise<TicketComment[]> {
    if (!includeInternal) {
      return await db
        .select()
        .from(ticketComments)
        .where(and(
          eq(ticketComments.ticketId, ticketId),
          eq(ticketComments.isInternal, false)
        ))
        .orderBy(ticketComments.createdAt);
    }
    
    return await db
      .select()
      .from(ticketComments)
      .where(eq(ticketComments.ticketId, ticketId))
      .orderBy(ticketComments.createdAt);
  }

  async createTicketComment(commentData: InsertTicketComment): Promise<TicketComment> {
    const [comment] = await db
      .insert(ticketComments)
      .values(commentData)
      .returning();
    return comment;
  }

  // Telegram message operations
  async createTelegramMessage(messageData: InsertTelegramMessage): Promise<TelegramMessage> {
    const [message] = await db
      .insert(telegramMessages)
      .values(messageData)
      .returning();
    return message;
  }

  async getTelegramMessages(telegramId: string, limit = 50): Promise<TelegramMessage[]> {
    return await db
      .select()
      .from(telegramMessages)
      .where(eq(telegramMessages.telegramId, telegramId))
      .orderBy(desc(telegramMessages.createdAt))
      .limit(limit);
  }

  // Dashboard analytics
  async getTicketStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const allTickets = await db.select().from(tickets);
    
    const stats = {
      total: allTickets.length,
      pending: allTickets.filter(t => t.status === 'pending').length,
      inProgress: allTickets.filter(t => t.status === 'in_progress').length,
      completed: allTickets.filter(t => t.status === 'completed').length,
      byCategory: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };
    
    // Count by category
    allTickets.forEach(ticket => {
      stats.byCategory[ticket.category] = (stats.byCategory[ticket.category] || 0) + 1;
    });
    
    // Count by priority
    allTickets.forEach(ticket => {
      stats.byPriority[ticket.priority] = (stats.byPriority[ticket.priority] || 0) + 1;
    });
    
    return stats;
  }
}

export const storage = new DatabaseStorage();