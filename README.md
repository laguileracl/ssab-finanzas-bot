# SSAB Chile Finance Telegram Bot System

A comprehensive Telegram bot system for SSAB Chile finance management, featuring ticket management, client data retrieval, invoice aging reports, and supplier document management.

## Features

### Core Functionality
- **Ticket Management System**: Create, track, and manage finance support tickets
- **Client Data Retrieval**: Search client information by RUT or name from Google Sheets
- **Invoice Aging Reports**: Generate and download aging reports in Excel format
- **Supplier Documents**: Access standard company documents for supplier registration
- **PythonAnywhere Integration**: Publish events to external systems via REST API

### Telegram Commands
- `/start` - Welcome message and command overview
- `/cliente <RUT/Name>` - Retrieve client basic data
- `/estado_cuenta <RUT>` - Get aging report with Excel download
- `/documentos_proveedor` - Get supplier registration documents
- `/request` - Create new support ticket
- `/mis_tickets` - View user's tickets
- `/tickets_pendientes` - View pending tickets (finance staff only)
- `/help` - Get help and support

## Architecture

The system follows a modular architecture with clear separation of concerns:

```
server/
├── controllers/          # Business logic controllers
│   └── clientController.ts
├── services/            # External service integrations
│   ├── googleSheetsService.ts
│   ├── pythonAnywhereService.ts
│   └── excelService.ts
├── routes/              # Command route handlers
│   ├── clientRoutes.ts
│   └── ticketRoutes.ts
├── utils/               # Utility functions
│   └── formatting.ts
├── storage.ts           # Database operations
├── telegram-bot.ts      # Main bot implementation
└── index.ts            # Application entry point
```

## Prerequisites

### Required Services
1. **Telegram Bot Token**: Create a bot via @BotFather
2. **PostgreSQL Database**: For data persistence
3. **Google Service Account**: For Google Sheets integration
4. **PythonAnywhere API**: For event publishing (optional)

### Environment Variables
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Google Sheets Integration
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nkey_content\n-----END PRIVATE KEY-----
GOOGLE_SHEETS_CLIENT_ID=your_client_sheet_id
GOOGLE_SHEETS_AGING_ID=your_aging_sheet_id

# PythonAnywhere Integration (Optional)
PYTHONANYWHERE_API_URL=https://yourusername.pythonanywhere.com/api
PYTHONANYWHERE_API_KEY=your_api_key

# Session Management
SESSION_SECRET=your_session_secret
```

## Installation & Setup

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd ssab-finance-bot
npm install
```

### 2. Database Setup
```bash
# Push database schema
npm run db:push

# Verify database connection
npm run db:check
```

### 3. Google Sheets Setup

#### Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google Sheets API
4. Create Service Account with Sheets API access
5. Download JSON key file
6. Extract email and private key for environment variables

#### Prepare Google Sheets
Create two Google Sheets with the following structure:

**Client Data Sheet** (columns A-I):
- A: RUT
- B: Company Name
- C: Email
- D: Phone
- E: Address
- F: Contact Person
- G: Credit Limit
- H: Payment Terms
- I: Status

**Aging Report Sheet** (columns A-J):
- A: Client RUT
- B: Client Name
- C: Invoice Number
- D: Invoice Date
- E: Due Date
- F: Invoice Amount
- G: Balance
- H: Days Overdue
- I: Status
- J: Notes

Share both sheets with your service account email with Viewer permissions.

### 4. Supplier Documents Setup
Update the document URLs in `server/controllers/clientController.ts`:
```typescript
const documents = [
  {
    name: 'Formulario de Registro de Proveedor',
    url: 'https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing',
    description: 'Formulario para registro de nuevos proveedores'
  },
  // Add more documents...
];
```

## Deployment

### Option 1: Replit Deployment

1. **Create Replit Project**
   - Import from GitHub repository
   - Set environment variables in Secrets tab
   - Ensure PostgreSQL database is provisioned

2. **Configure Environment**
   ```bash
   # Replit automatically handles most dependencies
   # Verify database connection
   npm run db:push
   ```

3. **Deploy**
   - Click "Deploy" button in Replit
   - Select "Static Deployment" for web interface
   - Bot will run automatically on Replit's infrastructure

### Option 2: Railway Deployment

1. **Create Railway Project**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and initialize
   railway login
   railway init
   ```

2. **Add PostgreSQL Database**
   ```bash
   railway add postgresql
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set TELEGRAM_BOT_TOKEN=your_token
   railway variables set GOOGLE_SERVICE_ACCOUNT_EMAIL=your_email
   # ... set all other variables
   ```

4. **Deploy**
   ```bash
   railway up
   ```

### Option 3: Manual VPS Deployment

1. **Server Setup**
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   npm install -g pm2
   ```

2. **Application Setup**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd ssab-finance-bot
   npm install
   
   # Set environment variables
   cp .env.example .env
   # Edit .env with your values
   
   # Setup database
   npm run db:push
   ```

3. **Start Application**
   ```bash
   # Start with PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## Configuration Files

### ecosystem.config.js (PM2 Configuration)
```javascript
module.exports = {
  apps: [{
    name: 'ssab-finance-bot',
    script: 'server/index.ts',
    interpreter: 'tsx',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
```

### .env.example
```env
# Copy this file to .env and fill in your values
TELEGRAM_BOT_TOKEN=
DATABASE_URL=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_SHEETS_CLIENT_ID=
GOOGLE_SHEETS_AGING_ID=
PYTHONANYWHERE_API_URL=
PYTHONANYWHERE_API_KEY=
SESSION_SECRET=
```

## PythonAnywhere Integration

The system publishes events to your PythonAnywhere application for external processing:

### Event Types Published
- `client_data_requested` - When client data is queried
- `account_statement_requested` - When aging report is generated
- `ticket_created` - When new ticket is created
- `ticket_status_updated` - When ticket status changes
- `ticket_completed` - When ticket is completed

### Event Payload Structure
```json
{
  "event_type": "client_data_requested",
  "user_id": "telegram_user_id",
  "timestamp": "2024-01-01T12:00:00Z",
  "source": "telegram_bot_ssab",
  "data": {
    "identifier": "12345678-9",
    "client_rut": "12345678-9",
    "client_name": "Empresa ABC"
  }
}
```

### PythonAnywhere Endpoint Setup
Your PythonAnywhere application should have an endpoint to receive events:
```python
@app.route('/api/events', methods=['POST'])
def receive_event():
    event_data = request.json
    # Process event data
    return {"status": "received"}
```

## Monitoring & Maintenance

### Log Files
- Application logs: `logs/combined.log`
- Error logs: `logs/err.log`
- Output logs: `logs/out.log`

### Health Checks
```bash
# Check bot status
curl http://localhost:5000/api/health

# Check database connection
npm run db:check

# Verify Google Sheets access
npm run test:sheets
```

### Common Issues

1. **Bot Not Responding**
   - Check TELEGRAM_BOT_TOKEN validity
   - Verify internet connectivity
   - Check PM2 process status: `pm2 status`

2. **Database Connection Errors**
   - Verify DATABASE_URL format
   - Check PostgreSQL service status
   - Run `npm run db:push` to sync schema

3. **Google Sheets Integration Failing**
   - Verify service account permissions
   - Check sheet IDs in environment variables
   - Ensure sheets are shared with service account

4. **Excel Generation Errors**
   - Check disk space for temporary files
   - Verify ExcelJS dependencies are installed
   - Monitor memory usage for large reports

## Development

### Running Locally
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# Database operations
npm run db:push      # Push schema changes
npm run db:studio    # Open database studio
npm run db:generate  # Generate migrations
```

### Testing
```bash
# Run all tests
npm test

# Test specific components
npm run test:bot     # Test bot functionality
npm run test:sheets  # Test Google Sheets integration
npm run test:excel   # Test Excel generation
```

### Code Structure Guidelines
- Controllers handle business logic
- Services manage external integrations
- Routes define command handlers
- Utils provide shared functionality
- Storage handles database operations

## Support

For issues or questions:
1. Check logs for error details
2. Verify environment variable configuration
3. Test individual components (database, Google Sheets, etc.)
4. Contact system administrator with specific error messages

## License

Internal use only - SSAB Chile Finance Department