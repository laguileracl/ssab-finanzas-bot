import TelegramBot from 'node-telegram-bot-api';
import { storage } from '../storage';
import { PythonAnywhereService } from '../services/pythonAnywhereService';
import { formatDateTime } from '../utils/formatting';

export class TicketRoutes {
  private pythonAnywhereService: PythonAnywhereService;

  constructor() {
    this.pythonAnywhereService = new PythonAnywhereService();
  }

  registerRoutes(bot: TelegramBot) {
    // Enhanced ticket creation with PythonAnywhere integration
    bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message?.chat.id;
      const telegramId = callbackQuery.from.id.toString();
      const data = callbackQuery.data;

      if (!chatId || !data) return;

      if (data.startsWith('create_ticket_')) {
        const templateId = parseInt(data.split('_')[2]);
        
        try {
          const template = await storage.getTicketTemplate(templateId);
          if (!template) {
            await bot.sendMessage(chatId, '❌ Plantilla no encontrada');
            return;
          }

          const telegramUser = await storage.getTelegramUser(telegramId);
          if (!telegramUser) {
            await bot.sendMessage(chatId, '❌ Usuario no registrado');
            return;
          }

          // Create ticket
          const ticket = await storage.createTicket({
            title: `${template.name} - ${telegramUser.username}`,
            description: template.description,
            category: template.category,
            priority: template.priority,
            status: 'pending',
            requesterId: telegramUser.id,
            estimatedTimeHours: template.estimatedTimeHours
          });

          // Publish event to PythonAnywhere
          await this.pythonAnywhereService.publishTicketEvent(
            'ticket_created',
            ticket,
            telegramId
          );

          await bot.sendMessage(chatId, `✅ Ticket #${ticket.id} creado exitosamente\n\n📋 ${ticket.title}\n📝 ${ticket.description}\n🏷️ Categoría: ${ticket.category}\n⚡ Prioridad: ${ticket.priority}`);

          // Notify finance team
          const financeUsers = await storage.getTelegramUsersByRole('finance');
          for (const user of financeUsers) {
            try {
              await bot.sendMessage(
                parseInt(user.telegramId),
                `🔔 Nuevo ticket creado:\n\n#${ticket.id} - ${ticket.title}\nSolicitante: ${telegramUser.username}\nCategoría: ${ticket.category}\nPrioridad: ${ticket.priority}`
              );
            } catch (error) {
              console.error(`Failed to notify user ${user.telegramId}:`, error);
            }
          }

        } catch (error) {
          console.error('Error creating ticket:', error);
          await bot.sendMessage(chatId, '❌ Error al crear el ticket');
        }
      }

      if (data.startsWith('update_status_')) {
        const [, , ticketId, newStatus] = data.split('_');
        
        try {
          const ticket = await storage.updateTicket(parseInt(ticketId), { status: newStatus });
          if (!ticket) {
            await bot.sendMessage(chatId, '❌ Ticket no encontrado');
            return;
          }

          // Publish event to PythonAnywhere
          await this.pythonAnywhereService.publishTicketEvent(
            'ticket_status_updated',
            ticket,
            telegramId
          );

          await bot.sendMessage(chatId, `✅ Ticket #${ticket.id} actualizado a: ${newStatus}`);

          // Notify requester if different from updater
          const telegramUser = await storage.getTelegramUser(telegramId);
          const requester = await storage.getTelegramUser(ticket.requesterId.toString());
          
          if (requester && requester.telegramId !== telegramId) {
            try {
              await bot.sendMessage(
                parseInt(requester.telegramId),
                `📬 Tu ticket #${ticket.id} ha sido actualizado\n\nNuevo estado: ${newStatus}\nActualizado por: ${telegramUser?.username || 'Sistema'}\nFecha: ${formatDateTime(new Date())}`
              );
            } catch (error) {
              console.error(`Failed to notify requester ${requester.telegramId}:`, error);
            }
          }

        } catch (error) {
          console.error('Error updating ticket status:', error);
          await bot.sendMessage(chatId, '❌ Error al actualizar el ticket');
        }
      }
    });

    // /mis_tickets command
    bot.onText(/\/mis_tickets/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || '';

      try {
        const telegramUser = await storage.getTelegramUser(telegramId);
        if (!telegramUser) {
          await bot.sendMessage(chatId, '❌ Usuario no registrado');
          return;
        }

        const tickets = await storage.getTicketsByRequester(telegramUser.id);
        
        if (tickets.length === 0) {
          await bot.sendMessage(chatId, '📋 No tienes tickets creados');
          return;
        }

        let message = '📋 **TUS TICKETS**\n\n';
        tickets.forEach(ticket => {
          const statusEmoji = ticket.status === 'completed' ? '✅' : 
                            ticket.status === 'in_progress' ? '🔄' : '⏳';
          message += `${statusEmoji} **#${ticket.id}** - ${ticket.title}\n`;
          message += `   Estado: ${ticket.status}\n`;
          message += `   Categoría: ${ticket.category}\n`;
          message += `   Creado: ${formatDateTime(ticket.createdAt)}\n\n`;
        });

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

      } catch (error) {
        console.error('Error fetching user tickets:', error);
        await bot.sendMessage(chatId, '❌ Error al obtener tus tickets');
      }
    });

    // /tickets_pendientes command (for finance team)
    bot.onText(/\/tickets_pendientes/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || '';

      try {
        const telegramUser = await storage.getTelegramUser(telegramId);
        if (!telegramUser || !['finance', 'admin'].includes(telegramUser.role)) {
          await bot.sendMessage(chatId, '❌ No tienes permisos para ver tickets pendientes');
          return;
        }

        const tickets = await storage.getTickets({ status: 'pending' });
        
        if (tickets.length === 0) {
          await bot.sendMessage(chatId, '✅ No hay tickets pendientes');
          return;
        }

        let message = '⏳ **TICKETS PENDIENTES**\n\n';
        tickets.forEach(ticket => {
          const priorityEmoji = ticket.priority === 'high' ? '🔴' :
                              ticket.priority === 'medium' ? '🟡' : '🟢';
          message += `${priorityEmoji} **#${ticket.id}** - ${ticket.title}\n`;
          message += `   Categoría: ${ticket.category}\n`;
          message += `   Prioridad: ${ticket.priority}\n`;
          message += `   Creado: ${formatDateTime(ticket.createdAt)}\n\n`;
        });

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

      } catch (error) {
        console.error('Error fetching pending tickets:', error);
        await bot.sendMessage(chatId, '❌ Error al obtener tickets pendientes');
      }
    });
  }
}