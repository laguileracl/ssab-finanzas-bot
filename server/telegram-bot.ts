import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';
import type { TelegramUser, TicketTemplate, Ticket } from '@shared/schema';

class FinanceTelegramBot {
  private bot: TelegramBot;
  private userSessions: Map<string, { step: string; data: any }> = new Map();

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.setupCommands();
    this.setupCallbacks();
  }

  private setupCommands() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId) return;

      // Check if user exists, if not create them
      let user = await storage.getTelegramUser(telegramId);
      if (!user) {
        user = await storage.createTelegramUser({
          telegramId,
          username: msg.from?.username,
          firstName: msg.from?.first_name,
          lastName: msg.from?.last_name,
          role: 'requester',
        });
      }

      await this.bot.sendMessage(chatId, 
        `🏦 Welcome to Finance Support Bot!\n\n` +
        `I'm here to help you with financial requests. Here's what you can do:\n\n` +
        `📝 /request - Submit a new finance request\n` +
        `📋 /status - Check your ticket status\n` +
        `❓ /help - Get help and support\n\n` +
        `Let me know how I can assist you today!`
      );
    });

    // Request command
    this.bot.onText(/\/request/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId) return;

      const templates = await storage.getTicketTemplates();
      
      if (templates.length === 0) {
        await this.bot.sendMessage(chatId, 
          'Sorry, no request templates are available at the moment. Please contact your finance team.'
        );
        return;
      }

      const keyboard = {
        inline_keyboard: templates.map(template => [{
          text: `${this.getCategoryEmoji(template.category)} ${template.name}`,
          callback_data: `template_${template.id}`
        }])
      };

      await this.bot.sendMessage(chatId, 
        '📝 Please select the type of request you want to submit:',
        { reply_markup: keyboard }
      );
    });

    // Status command
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId) return;

      const user = await storage.getTelegramUser(telegramId);
      if (!user) {
        await this.bot.sendMessage(chatId, 'Please start the bot first with /start');
        return;
      }

      const tickets = await storage.getTicketsByRequester(user.id);
      
      if (tickets.length === 0) {
        await this.bot.sendMessage(chatId, 'You have no active requests.');
        return;
      }

      let message = '📋 Your Finance Requests:\n\n';
      tickets.forEach((ticket, index) => {
        const statusEmoji = this.getStatusEmoji(ticket.status);
        const priorityEmoji = this.getPriorityEmoji(ticket.priority);
        message += `${index + 1}. ${statusEmoji} ${ticket.title}\n`;
        message += `   ${priorityEmoji} Priority: ${ticket.priority}\n`;
        message += `   📅 Created: ${ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'Unknown'}\n`;
        if (ticket.response) {
          message += `   💬 Response: ${ticket.response}\n`;
        }
        message += '\n';
      });

      await this.bot.sendMessage(chatId, message);
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      
      await this.bot.sendMessage(chatId, 
        `🆘 Finance Bot Help\n\n` +
        `Commands:\n` +
        `📝 /request - Submit a new finance request\n` +
        `📋 /status - Check your current requests\n` +
        `🏠 /start - Return to main menu\n\n` +
        `For urgent matters, please contact the finance team directly.\n\n` +
        `Need more help? Contact support at your organization.`
      );
    });
  }

  private setupCallbacks() {
    this.bot.on('callback_query', async (callbackQuery) => {
      const msg = callbackQuery.message;
      const data = callbackQuery.data;
      const chatId = msg?.chat.id;
      const telegramId = callbackQuery.from.id.toString();

      if (!chatId || !data) return;

      // Handle template selection
      if (data.startsWith('template_')) {
        const templateId = parseInt(data.replace('template_', ''));
        const template = await storage.getTicketTemplate(templateId);
        
        if (!template) {
          await this.bot.sendMessage(chatId, 'Template not found. Please try again.');
          return;
        }

        // Start the request process
        this.userSessions.set(telegramId, {
          step: 'collecting_info',
          data: { templateId, template, responses: {} }
        });

        await this.bot.editMessageText(
          `📝 Creating: ${template.name}\n\n${template.description}\n\nPlease provide a title for your request:`,
          { chat_id: chatId, message_id: msg?.message_id }
        );
      }

      // Handle ticket actions (for finance team)
      if (data.startsWith('ticket_')) {
        await this.handleTicketAction(chatId, telegramId, data);
      }

      await this.bot.answerCallbackQuery(callbackQuery.id);
    });

    // Handle text messages for form filling
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      const text = msg.text;

      if (!telegramId || !text || text.startsWith('/')) return;

      const session = this.userSessions.get(telegramId);
      if (!session) return;

      if (session.step === 'collecting_info') {
        await this.handleFormInput(chatId, telegramId, text, session);
      }
    });
  }

  private async handleFormInput(chatId: number, telegramId: string, text: string, session: any) {
    const { template, responses } = session.data;

    if (!responses.title) {
      responses.title = text;
      await this.bot.sendMessage(chatId, 'Please provide a detailed description of your request:');
    } else if (!responses.description) {
      responses.description = text;
      
      // Create the ticket
      const user = await storage.getTelegramUser(telegramId);
      if (!user) return;

      const ticket = await storage.createTicket({
        templateId: template.id,
        title: responses.title,
        description: responses.description,
        category: template.category,
        priority: template.priority,
        requesterId: user.id,
        requestData: responses,
      });

      // Log the message
      await storage.createTelegramMessage({
        telegramId,
        ticketId: ticket.id,
        messageType: 'request',
        content: `New ticket created: ${responses.title}`,
      });

      // Notify finance team
      await this.notifyFinanceTeam(ticket);

      await this.bot.sendMessage(chatId, 
        `✅ Your request has been submitted successfully!\n\n` +
        `🎫 Ticket ID: #${ticket.id}\n` +
        `📝 Title: ${responses.title}\n` +
        `⏰ The finance team has been notified and will respond soon.\n\n` +
        `Use /status to check your request status.`
      );

      // Clear session
      this.userSessions.delete(telegramId);
    }
  }

  private async notifyFinanceTeam(ticket: Ticket) {
    const financeUsers = await storage.getTelegramUsersByRole('finance_team');
    
    for (const user of financeUsers) {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Accept', callback_data: `ticket_accept_${ticket.id}` },
            { text: '📋 View Details', callback_data: `ticket_view_${ticket.id}` }
          ]
        ]
      };

      const message = 
        `🚨 New Finance Request\n\n` +
        `🎫 Ticket #${ticket.id}\n` +
        `📝 ${ticket.title}\n` +
        `📊 Category: ${ticket.category}\n` +
        `⚡ Priority: ${ticket.priority}\n` +
        `📄 Description: ${ticket.description}\n` +
        `📅 Created: ${new Date(ticket.createdAt).toLocaleString()}`;

      try {
        await this.bot.sendMessage(parseInt(user.telegramId), message, { reply_markup: keyboard });
      } catch (error) {
        console.error(`Failed to notify user ${user.telegramId}:`, error);
      }
    }
  }

  private async handleTicketAction(chatId: number, telegramId: string, data: string) {
    const [action, ticketIdStr] = data.replace('ticket_', '').split('_');
    const ticketId = parseInt(ticketIdStr);

    const ticket = await storage.getTicket(ticketId);
    if (!ticket) {
      await this.bot.sendMessage(chatId, 'Ticket not found.');
      return;
    }

    const user = await storage.getTelegramUser(telegramId);
    if (!user || user.role !== 'finance_team') {
      await this.bot.sendMessage(chatId, 'You are not authorized to perform this action.');
      return;
    }

    switch (action) {
      case 'accept':
        await storage.updateTicket(ticketId, {
          status: 'in_progress',
          assigneeId: user.id,
        });

        await this.bot.sendMessage(chatId, 
          `✅ You have accepted ticket #${ticketId}. Please provide a response when completed.`
        );

        // Notify requester
        const requester = await storage.getTelegramUser(ticket.requesterId?.toString() || '');
        if (requester) {
          await this.bot.sendMessage(parseInt(requester.telegramId), 
            `📢 Update on your request #${ticketId}:\n\n` +
            `✅ Your request has been accepted and is now being processed.\n` +
            `👤 Assigned to: ${user.firstName} ${user.lastName}`
          );
        }
        break;

      case 'view':
        const comments = await storage.getTicketComments(ticketId, true);
        let detailMessage = 
          `📋 Ticket #${ticketId} Details\n\n` +
          `📝 Title: ${ticket.title}\n` +
          `📄 Description: ${ticket.description}\n` +
          `📊 Category: ${ticket.category}\n` +
          `⚡ Priority: ${ticket.priority}\n` +
          `📊 Status: ${ticket.status}\n` +
          `📅 Created: ${new Date(ticket.createdAt).toLocaleString()}\n`;

        if (comments.length > 0) {
          detailMessage += '\n💬 Comments:\n';
          comments.forEach(comment => {
            detailMessage += `• ${comment.comment}\n`;
          });
        }

        const keyboard = {
          inline_keyboard: [
            [
              { text: '✅ Complete', callback_data: `ticket_complete_${ticketId}` },
              { text: '💬 Add Comment', callback_data: `ticket_comment_${ticketId}` }
            ]
          ]
        };

        await this.bot.sendMessage(chatId, detailMessage, { reply_markup: keyboard });
        break;

      case 'complete':
        this.userSessions.set(telegramId, {
          step: 'completing_ticket',
          data: { ticketId }
        });

        await this.bot.sendMessage(chatId, 
          `Please provide the completion response for ticket #${ticketId}:`
        );
        break;
    }
  }

  private getCategoryEmoji(category: string): string {
    const emojis: Record<string, string> = {
      payment: '💳',
      invoice: '📄',
      budget: '💰',
      expense: '📊',
      other: '📋'
    };
    return emojis[category] || '📋';
  }

  private getStatusEmoji(status: string): string {
    const emojis: Record<string, string> = {
      pending: '⏳',
      in_progress: '🔄',
      completed: '✅',
      cancelled: '❌'
    };
    return emojis[status] || '⏳';
  }

  private getPriorityEmoji(priority: string): string {
    const emojis: Record<string, string> = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴'
    };
    return emojis[priority] || '🟡';
  }

  public async completeTicket(telegramId: string, response: string) {
    const session = this.userSessions.get(telegramId);
    if (!session || session.step !== 'completing_ticket') return;

    const { ticketId } = session.data;
    const ticket = await storage.updateTicket(ticketId, {
      status: 'completed',
      response,
    });

    if (!ticket) return;

    // Notify requester
    const requester = await storage.getTelegramUser(ticket.requesterId?.toString() || '');
    if (requester) {
      await this.bot.sendMessage(parseInt(requester.telegramId), 
        `✅ Your request #${ticketId} has been completed!\n\n` +
        `📝 Title: ${ticket.title}\n` +
        `💬 Response: ${response}\n\n` +
        `Thank you for using our finance support system.`
      );
    }

    // Clear session
    this.userSessions.delete(telegramId);

    return ticket;
  }

  public getBot() {
    return this.bot;
  }
}

export { FinanceTelegramBot };