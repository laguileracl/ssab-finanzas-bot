import { google } from 'googleapis';

export interface ClientData {
  rut: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  creditLimit: number;
  paymentTerms: string;
  status: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  amount: number;
  balance: number;
  daysOverdue: number;
  status: string;
}

export interface AgingData {
  clientName: string;
  clientRut: string;
  totalAmount: number;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  invoices: InvoiceData[];
}

export class GoogleSheetsService {
  private sheets: any;
  private readonly CLIENT_SHEET_ID = process.env.GOOGLE_SHEETS_CLIENT_ID;
  private readonly AGING_SHEET_ID = process.env.GOOGLE_SHEETS_AGING_ID;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('Error initializing Google Sheets auth:', error);
      throw new Error('Failed to initialize Google Sheets authentication');
    }
  }

  async findClient(identifier: string): Promise<ClientData | null> {
    try {
      if (!this.CLIENT_SHEET_ID) {
        throw new Error('Google Sheets Client ID not configured');
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.CLIENT_SHEET_ID,
        range: 'Clientes!A:I', // Assuming columns A-I contain client data
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return null;
      }

      // Skip header row and search for client
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rut = row[0] || '';
        const name = row[1] || '';

        // Search by RUT or name (case insensitive)
        if (rut.toLowerCase().includes(identifier.toLowerCase()) || 
            name.toLowerCase().includes(identifier.toLowerCase())) {
          return {
            rut: row[0] || '',
            name: row[1] || '',
            email: row[2] || '',
            phone: row[3] || '',
            address: row[4] || '',
            contactPerson: row[5] || '',
            creditLimit: parseFloat(row[6]) || 0,
            paymentTerms: row[7] || '',
            status: row[8] || 'Active'
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding client:', error);
      throw error;
    }
  }

  async getClientAging(rut: string): Promise<AgingData | null> {
    try {
      if (!this.AGING_SHEET_ID) {
        throw new Error('Google Sheets Aging ID not configured');
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.AGING_SHEET_ID,
        range: 'Aging!A:J', // Assuming columns A-J contain aging data
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return null;
      }

      const invoices: InvoiceData[] = [];
      let clientName = '';
      let totalAmount = 0;
      let current = 0;
      let days30 = 0;
      let days60 = 0;
      let days90 = 0;
      let over90 = 0;

      // Skip header row and find invoices for the RUT
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const invoiceRut = row[0] || '';

        if (invoiceRut.toLowerCase() === rut.toLowerCase()) {
          if (!clientName) {
            clientName = row[1] || '';
          }

          const amount = parseFloat(row[5]) || 0;
          const balance = parseFloat(row[6]) || 0;
          const daysOverdue = parseInt(row[7]) || 0;

          const invoice: InvoiceData = {
            invoiceNumber: row[2] || '',
            date: new Date(row[3] || ''),
            dueDate: new Date(row[4] || ''),
            amount,
            balance,
            daysOverdue,
            status: row[8] || 'Pending'
          };

          invoices.push(invoice);
          totalAmount += balance;

          // Categorize by aging buckets
          if (daysOverdue <= 0) {
            current += balance;
          } else if (daysOverdue <= 30) {
            days30 += balance;
          } else if (daysOverdue <= 60) {
            days60 += balance;
          } else if (daysOverdue <= 90) {
            days90 += balance;
          } else {
            over90 += balance;
          }
        }
      }

      if (invoices.length === 0) {
        return null;
      }

      return {
        clientName,
        clientRut: rut,
        totalAmount,
        current,
        days30,
        days60,
        days90,
        over90,
        invoices
      };
    } catch (error) {
      console.error('Error getting client aging:', error);
      throw error;
    }
  }
}