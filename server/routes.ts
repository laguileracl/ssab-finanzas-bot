import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertTelegramUserSchema,
  insertTicketTemplateSchema,
  insertTicketSchema,
  insertTicketCommentSchema,
} from "@shared/schema";
import { FinanceTelegramBot } from "./telegram-bot";

let telegramBot: FinanceTelegramBot | null = null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize Telegram Bot if token is provided
  if (process.env.TELEGRAM_BOT_TOKEN) {
    telegramBot = new FinanceTelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    console.log("Telegram bot initialized");
  } else {
    console.log("TELEGRAM_BOT_TOKEN not found. Telegram bot functionality disabled.");
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard analytics
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getTicketStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Telegram Users routes
  app.get('/api/telegram-users', isAuthenticated, async (req, res) => {
    try {
      const { role } = req.query;
      let users;
      
      if (role && typeof role === 'string') {
        users = await storage.getTelegramUsersByRole(role);
      } else {
        // For now, get all users by getting each role separately
        const requesters = await storage.getTelegramUsersByRole('requester');
        const financeTeam = await storage.getTelegramUsersByRole('finance_team');
        const managers = await storage.getTelegramUsersByRole('manager');
        users = [...requesters, ...financeTeam, ...managers];
      }
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching telegram users:", error);
      res.status(500).json({ message: "Failed to fetch telegram users" });
    }
  });

  app.post('/api/telegram-users', isAuthenticated, async (req, res) => {
    try {
      const userData = insertTelegramUserSchema.parse(req.body);
      const user = await storage.createTelegramUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating telegram user:", error);
      res.status(500).json({ message: "Failed to create telegram user" });
    }
  });

  app.patch('/api/telegram-users/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const user = await storage.updateTelegramUser(id, updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error updating telegram user:", error);
      res.status(500).json({ message: "Failed to update telegram user" });
    }
  });

  // Ticket Templates routes
  app.get('/api/ticket-templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getTicketTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching ticket templates:", error);
      res.status(500).json({ message: "Failed to fetch ticket templates" });
    }
  });

  app.get('/api/ticket-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getTicketTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching ticket template:", error);
      res.status(500).json({ message: "Failed to fetch ticket template" });
    }
  });

  app.post('/api/ticket-templates', isAuthenticated, async (req, res) => {
    try {
      const templateData = insertTicketTemplateSchema.parse(req.body);
      const template = await storage.createTicketTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating ticket template:", error);
      res.status(500).json({ message: "Failed to create ticket template" });
    }
  });

  app.patch('/api/ticket-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const template = await storage.updateTicketTemplate(id, updates);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error updating ticket template:", error);
      res.status(500).json({ message: "Failed to update ticket template" });
    }
  });

  app.delete('/api/ticket-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTicketTemplate(id);
      
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting ticket template:", error);
      res.status(500).json({ message: "Failed to delete ticket template" });
    }
  });

  // Tickets routes
  app.get('/api/tickets', isAuthenticated, async (req, res) => {
    try {
      const { status, priority, category, assigneeId, requesterId } = req.query;
      
      const filters: any = {};
      if (status && typeof status === 'string') filters.status = status;
      if (priority && typeof priority === 'string') filters.priority = priority;
      if (category && typeof category === 'string') filters.category = category;
      if (assigneeId && typeof assigneeId === 'string') filters.assigneeId = parseInt(assigneeId);
      if (requesterId && typeof requesterId === 'string') filters.requesterId = parseInt(requesterId);
      
      const tickets = await storage.getTickets(filters);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get('/api/tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicket(id);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.post('/api/tickets', isAuthenticated, async (req, res) => {
    try {
      const ticketData = insertTicketSchema.parse(req.body);
      const ticket = await storage.createTicket(ticketData);
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  app.patch('/api/tickets/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const ticket = await storage.updateTicket(id, updates);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  // Ticket Comments routes
  app.get('/api/tickets/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const { includeInternal } = req.query;
      const comments = await storage.getTicketComments(
        ticketId, 
        includeInternal === 'true'
      );
      res.json(comments);
    } catch (error) {
      console.error("Error fetching ticket comments:", error);
      res.status(500).json({ message: "Failed to fetch ticket comments" });
    }
  });

  app.post('/api/tickets/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const commentData = insertTicketCommentSchema.parse({
        ...req.body,
        ticketId,
      });
      const comment = await storage.createTicketComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating ticket comment:", error);
      res.status(500).json({ message: "Failed to create ticket comment" });
    }
  });

  // Telegram Bot webhook (optional)
  app.post('/api/telegram/webhook', async (req, res) => {
    if (!telegramBot) {
      return res.status(503).json({ message: "Telegram bot not configured" });
    }
    
    try {
      // Handle webhook updates here if needed
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Error handling telegram webhook:", error);
      res.status(500).json({ message: "Failed to handle webhook" });
    }
  });

  // Complete ticket via bot (called from telegram-bot.ts)
  app.post('/api/telegram/complete-ticket', async (req, res) => {
    try {
      const { telegramId, response } = req.body;
      
      if (!telegramBot) {
        return res.status(503).json({ message: "Telegram bot not configured" });
      }
      
      const ticket = await telegramBot.completeTicket(telegramId, response);
      res.json(ticket);
    } catch (error) {
      console.error("Error completing ticket:", error);
      res.status(500).json({ message: "Failed to complete ticket" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}