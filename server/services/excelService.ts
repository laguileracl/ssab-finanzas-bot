import ExcelJS from 'exceljs';
import { AgingData, InvoiceData } from './googleSheetsService';
import { formatCurrency, formatDate } from '../utils/formatting';

export class ExcelService {
  async generateAgingReport(agingData: AgingData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Estado de Cuenta');

    // Set column widths
    worksheet.columns = [
      { width: 15 }, // Invoice Number
      { width: 12 }, // Date
      { width: 12 }, // Due Date
      { width: 15 }, // Amount
      { width: 15 }, // Balance
      { width: 10 }, // Days Overdue
      { width: 12 }  // Status
    ];

    // Company header
    worksheet.mergeCells('A1:G1');
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'SSAB CHILE - ESTADO DE CUENTA';
    headerCell.font = { size: 16, bold: true };
    headerCell.alignment = { horizontal: 'center' };

    // Client information
    worksheet.mergeCells('A3:G3');
    const clientCell = worksheet.getCell('A3');
    clientCell.value = `Cliente: ${agingData.clientName} (${agingData.clientRut})`;
    clientCell.font = { size: 12, bold: true };

    // Date generated
    worksheet.mergeCells('A4:G4');
    const dateCell = worksheet.getCell('A4');
    dateCell.value = `Fecha de generación: ${formatDate(new Date())}`;
    dateCell.font = { size: 10 };

    // Aging summary
    worksheet.addRow([]);
    worksheet.addRow(['RESUMEN DE ANTIGUEDAD', '', '', '', '', '', '']);
    worksheet.getCell('A6').font = { bold: true };

    worksheet.addRow(['Al día', '', '', formatCurrency(agingData.current), '', '', '']);
    worksheet.addRow(['1-30 días', '', '', formatCurrency(agingData.days30), '', '', '']);
    worksheet.addRow(['31-60 días', '', '', formatCurrency(agingData.days60), '', '', '']);
    worksheet.addRow(['61-90 días', '', '', formatCurrency(agingData.days90), '', '', '']);
    worksheet.addRow(['Más de 90 días', '', '', formatCurrency(agingData.over90), '', '', '']);
    worksheet.addRow(['TOTAL', '', '', formatCurrency(agingData.totalAmount), '', '', '']);

    // Style summary section
    for (let row = 7; row <= 12; row++) {
      worksheet.getCell(`A${row}`).font = { bold: true };
      worksheet.getCell(`D${row}`).font = { bold: true };
      worksheet.getCell(`D${row}`).alignment = { horizontal: 'right' };
    }

    // Add separator
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Invoice details header
    const headerRow = worksheet.addRow([
      'Nº Factura',
      'Fecha',
      'Vencimiento',
      'Monto',
      'Saldo',
      'Días Vencido',
      'Estado'
    ]);

    // Style header row
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add invoice data
    agingData.invoices.forEach((invoice) => {
      const row = worksheet.addRow([
        invoice.invoiceNumber,
        formatDate(invoice.date),
        formatDate(invoice.dueDate),
        formatCurrency(invoice.amount),
        formatCurrency(invoice.balance),
        invoice.daysOverdue,
        invoice.status
      ]);

      // Color code by aging
      let fillColor = 'FFFFFFFF'; // White
      if (invoice.daysOverdue > 90) {
        fillColor = 'FFFF6B6B'; // Red
      } else if (invoice.daysOverdue > 60) {
        fillColor = 'FFFFA726'; // Orange
      } else if (invoice.daysOverdue > 30) {
        fillColor = 'FFFFFF9E'; // Yellow
      } else if (invoice.daysOverdue > 0) {
        fillColor = 'FFFFE0B2'; // Light orange
      }

      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Right align amounts
      row.getCell(4).alignment = { horizontal: 'right' };
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { horizontal: 'center' };
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateClientReport(clientData: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Datos Cliente');

    // Set column widths
    worksheet.columns = [
      { width: 20 },
      { width: 30 }
    ];

    // Header
    worksheet.mergeCells('A1:B1');
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'SSAB CHILE - DATOS DEL CLIENTE';
    headerCell.font = { size: 16, bold: true };
    headerCell.alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    // Client data
    const data = [
      ['RUT:', clientData.rut],
      ['Razón Social:', clientData.name],
      ['Email:', clientData.email],
      ['Teléfono:', clientData.phone],
      ['Dirección:', clientData.address],
      ['Persona de Contacto:', clientData.contactPerson],
      ['Límite de Crédito:', formatCurrency(clientData.creditLimit)],
      ['Condiciones de Pago:', clientData.paymentTerms],
      ['Estado:', clientData.status]
    ];

    data.forEach(([label, value]) => {
      const row = worksheet.addRow([label, value]);
      row.getCell(1).font = { bold: true };
      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}