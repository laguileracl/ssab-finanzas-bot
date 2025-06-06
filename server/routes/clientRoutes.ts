import TelegramBot from 'node-telegram-bot-api';
import { ClientController } from '../controllers/clientController';
import { formatCurrency, formatDate, formatRUT, validateRUT, getAgingColor } from '../utils/formatting';

export class ClientRoutes {
  private clientController: ClientController;

  constructor() {
    this.clientController = new ClientController();
  }

  registerRoutes(bot: TelegramBot) {
    // /cliente command - Get client data
    bot.onText(/\/cliente (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || '';
      const identifier = match?.[1]?.trim() || '';

      if (!identifier) {
        await bot.sendMessage(chatId, '❌ Por favor proporciona un RUT o nombre del cliente.\n\nEjemplo: /cliente 12345678-9\nEjemplo: /cliente Empresa ABC');
        return;
      }

      await bot.sendMessage(chatId, '🔍 Buscando información del cliente...');

      try {
        const result = await this.clientController.getClientData(identifier, telegramId);

        if (!result.success) {
          await bot.sendMessage(chatId, `❌ ${result.message}`);
          return;
        }

        const client = result.data;
        const message = `
📋 **DATOS DEL CLIENTE**

🏢 **Razón Social:** ${client.name}
🆔 **RUT:** ${formatRUT(client.rut)}
📧 **Email:** ${client.email || 'No registrado'}
📞 **Teléfono:** ${client.phone || 'No registrado'}
📍 **Dirección:** ${client.address || 'No registrada'}
👤 **Contacto:** ${client.contactPerson || 'No registrado'}
💰 **Límite Crédito:** ${formatCurrency(client.creditLimit)}
⏰ **Condiciones Pago:** ${client.paymentTerms || 'No definidas'}
📊 **Estado:** ${client.status}

Para obtener el estado de cuenta, usa:
\`/estado_cuenta ${client.rut}\`
        `;

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error in /cliente command:', error);
        await bot.sendMessage(chatId, '❌ Error interno del sistema. Por favor contacta al administrador.');
      }
    });

    // /estado_cuenta command - Get account statement with aging
    bot.onText(/\/estado_cuenta (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString() || '';
      const rut = match?.[1]?.trim() || '';

      if (!rut) {
        await bot.sendMessage(chatId, '❌ Por favor proporciona el RUT del cliente.\n\nEjemplo: /estado_cuenta 12345678-9');
        return;
      }

      if (!validateRUT(rut)) {
        await bot.sendMessage(chatId, '❌ El RUT proporcionado no es válido. Por favor verifica el formato.\n\nEjemplo: 12345678-9');
        return;
      }

      await bot.sendMessage(chatId, '📊 Generando estado de cuenta...');

      try {
        const result = await this.clientController.getAccountStatement(rut, telegramId);

        if (!result.success) {
          await bot.sendMessage(chatId, `❌ ${result.message}`);
          return;
        }

        const aging = result.data;
        
        // Send summary message
        const summaryMessage = `
📊 **ESTADO DE CUENTA**

🏢 **Cliente:** ${aging.clientName}
🆔 **RUT:** ${formatRUT(aging.clientRut)}
📅 **Fecha:** ${formatDate(new Date())}

💰 **RESUMEN DE ANTIGÜEDAD:**
${getAgingColor(0)} Al día: ${formatCurrency(aging.current)}
${getAgingColor(15)} 1-30 días: ${formatCurrency(aging.days30)}
${getAgingColor(45)} 31-60 días: ${formatCurrency(aging.days60)}
${getAgingColor(75)} 61-90 días: ${formatCurrency(aging.days90)}
${getAgingColor(120)} +90 días: ${formatCurrency(aging.over90)}

🔢 **TOTAL:** ${formatCurrency(aging.totalAmount)}
📄 **Facturas:** ${aging.invoices.length}
        `;

        await bot.sendMessage(chatId, summaryMessage, { parse_mode: 'Markdown' });

        // Send Excel file
        if (result.excelBuffer) {
          await bot.sendDocument(chatId, result.excelBuffer, {
            filename: `estado_cuenta_${aging.clientRut}_${formatDate(new Date()).replace(/\//g, '-')}.xlsx`,
            caption: '📎 Estado de cuenta detallado en Excel'
          });
        }

        // Show recent invoices (max 10)
        const recentInvoices = aging.invoices.slice(0, 10);
        if (recentInvoices.length > 0) {
          let invoicesMessage = '\n📋 **FACTURAS RECIENTES:**\n\n';
          
          recentInvoices.forEach(invoice => {
            invoicesMessage += `${getAgingColor(invoice.daysOverdue)} **${invoice.invoiceNumber}**\n`;
            invoicesMessage += `   Fecha: ${formatDate(invoice.date)}\n`;
            invoicesMessage += `   Vencimiento: ${formatDate(invoice.dueDate)}\n`;
            invoicesMessage += `   Saldo: ${formatCurrency(invoice.balance)}\n`;
            if (invoice.daysOverdue > 0) {
              invoicesMessage += `   Días vencido: ${invoice.daysOverdue}\n`;
            }
            invoicesMessage += '\n';
          });

          if (aging.invoices.length > 10) {
            invoicesMessage += `\n... y ${aging.invoices.length - 10} facturas más (ver archivo Excel)`;
          }

          await bot.sendMessage(chatId, invoicesMessage, { parse_mode: 'Markdown' });
        }

      } catch (error) {
        console.error('Error in /estado_cuenta command:', error);
        await bot.sendMessage(chatId, '❌ Error interno del sistema. Por favor contacta al administrador.');
      }
    });

    // /documentos_proveedor command - Get supplier documents
    bot.onText(/\/documentos_proveedor/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        const result = await this.clientController.getSupplierDocuments();

        if (!result.success) {
          await bot.sendMessage(chatId, `❌ ${result.message}`);
          return;
        }

        let message = '📁 **DOCUMENTOS PARA PROVEEDORES**\n\n';
        message += 'A continuación encontrarás los documentos necesarios para el registro y gestión de proveedores:\n\n';

        result.data.forEach((doc, index) => {
          message += `${index + 1}. **${doc.name}**\n`;
          message += `   📄 ${doc.description}\n`;
          message += `   🔗 [Descargar documento](${doc.url})\n\n`;
        });

        message += '\n💡 **Nota:** Si tienes problemas para acceder a algún documento, por favor contacta al área de finanzas.';

        await bot.sendMessage(chatId, message, { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });

      } catch (error) {
        console.error('Error in /documentos_proveedor command:', error);
        await bot.sendMessage(chatId, '❌ Error interno del sistema. Por favor contacta al administrador.');
      }
    });
  }
}