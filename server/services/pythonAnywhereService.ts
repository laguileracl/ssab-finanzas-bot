export interface EventData {
  event_type: string;
  user_id: string;
  timestamp?: string;
  data?: any;
}

export class PythonAnywhereService {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.apiUrl = process.env.PYTHONANYWHERE_API_URL || 'https://yourusername.pythonanywhere.com/api';
    this.apiKey = process.env.PYTHONANYWHERE_API_KEY || '';
  }

  async publishEvent(eventData: EventData): Promise<boolean> {
    try {
      if (!this.apiUrl || !this.apiKey) {
        console.warn('PythonAnywhere API not configured, skipping event publication');
        return false;
      }

      const payload = {
        ...eventData,
        timestamp: eventData.timestamp || new Date().toISOString(),
        source: 'telegram_bot_ssab'
      };

      const response = await fetch(`${this.apiUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'SSAB-TelegramBot/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Event published successfully:', result);
      return true;
    } catch (error) {
      console.error('Error publishing event to PythonAnywhere:', error);
      return false;
    }
  }

  async publishTicketEvent(eventType: string, ticketData: any, userId: string): Promise<boolean> {
    return this.publishEvent({
      event_type: eventType,
      user_id: userId,
      data: {
        ticket_id: ticketData.id,
        title: ticketData.title,
        category: ticketData.category,
        priority: ticketData.priority,
        status: ticketData.status,
        requester_id: ticketData.requesterId,
        assignee_id: ticketData.assigneeId
      }
    });
  }

  async publishUserEvent(eventType: string, userData: any, actionUserId: string): Promise<boolean> {
    return this.publishEvent({
      event_type: eventType,
      user_id: actionUserId,
      data: {
        target_user_id: userData.id,
        telegram_id: userData.telegramId,
        username: userData.username,
        role: userData.role
      }
    });
  }
}