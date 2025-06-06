import { GoogleSheetsService } from '../services/googleSheetsService';
import { PythonAnywhereService } from '../services/pythonAnywhereService';
import { ExcelService } from '../services/excelService';
import { storage } from '../storage';
import { formatCurrency, formatDate } from '../utils/formatting';

export class ClientController {
  private googleSheetsService: GoogleSheetsService;
  private pythonAnywhereService: PythonAnywhereService;
  private excelService: ExcelService;

  constructor() {
    this.googleSheetsService = new GoogleSheetsService();
    this.pythonAnywhereService = new PythonAnywhereService();
    this.excelService = new ExcelService();
  }

  async getClientData(identifier: string, requesterId: string) {
    try {
      // Search by RUT or name
      const clientData = await this.googleSheetsService.findClient(identifier);
      
      if (!clientData) {
        return {
          success: false,
          message: `No se encontró cliente con identificador: ${identifier}`
        };
      }

      // Log event to PythonAnywhere
      await this.pythonAnywhereService.publishEvent({
        event_type: 'client_data_requested',
        user_id: requesterId,
        data: {
          identifier,
          client_rut: clientData.rut,
          client_name: clientData.name
        }
      });

      return {
        success: true,
        data: clientData
      };
    } catch (error) {
      console.error('Error getting client data:', error);
      return {
        success: false,
        message: 'Error al obtener datos del cliente'
      };
    }
  }

  async getAccountStatement(rut: string, requesterId: string) {
    try {
      // Get aging report from Google Sheets
      const agingData = await this.googleSheetsService.getClientAging(rut);
      
      if (!agingData || agingData.invoices.length === 0) {
        return {
          success: false,
          message: `No se encontraron facturas para el RUT: ${rut}`
        };
      }

      // Generate Excel file
      const excelBuffer = await this.excelService.generateAgingReport(agingData);
      
      // Log event to PythonAnywhere
      await this.pythonAnywhereService.publishEvent({
        event_type: 'account_statement_requested',
        user_id: requesterId,
        data: {
          client_rut: rut,
          client_name: agingData.clientName,
          total_amount: agingData.totalAmount,
          invoice_count: agingData.invoices.length
        }
      });

      return {
        success: true,
        data: agingData,
        excelBuffer
      };
    } catch (error) {
      console.error('Error getting account statement:', error);
      return {
        success: false,
        message: 'Error al obtener estado de cuenta'
      };
    }
  }

  async getSupplierDocuments() {
    try {
      // Static links to company documents
      const documents = [
        {
          name: 'Formulario de Registro de Proveedor',
          url: 'https://drive.google.com/file/d/1ABC123/view?usp=sharing',
          description: 'Formulario para registro de nuevos proveedores'
        },
        {
          name: 'Condiciones Comerciales',
          url: 'https://drive.google.com/file/d/1DEF456/view?usp=sharing',
          description: 'Términos y condiciones comerciales de SSAB Chile'
        },
        {
          name: 'Política de Pagos',
          url: 'https://drive.google.com/file/d/1GHI789/view?usp=sharing',
          description: 'Política de pagos y plazos'
        },
        {
          name: 'Código de Conducta',
          url: 'https://drive.google.com/file/d/1JKL012/view?usp=sharing',
          description: 'Código de conducta para proveedores'
        }
      ];

      return {
        success: true,
        data: documents
      };
    } catch (error) {
      console.error('Error getting supplier documents:', error);
      return {
        success: false,
        message: 'Error al obtener documentos de proveedor'
      };
    }
  }
}