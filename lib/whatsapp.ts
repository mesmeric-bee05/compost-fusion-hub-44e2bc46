import axios from 'axios';

// WhatsApp Business API client
export class WhatsAppClient {
  private token: string;
  private phoneNumberId: string;
  private businessId: string;
  private apiVersion: string;

  constructor() {
    this.token = process.env.WHATSAPP_TOKEN!;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    this.businessId = process.env.WHATSAPP_BUSINESS_ID!;
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v17.0';
  }

  private getBaseUrl(): string {
    return `https://graph.facebook.com/${this.apiVersion}`;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Send a template message via WhatsApp
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'en',
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text?: string;
      }>;
    }>
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
            ...(components && { components }),
          },
        },
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to send WhatsApp template message: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Send a text message via WhatsApp
   */
  async sendTextMessage(to: string, message: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body: message,
          },
        },
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to send WhatsApp text message: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Send an interactive message (buttons or list) via WhatsApp
   */
  async sendInteractiveMessage(
    to: string,
    header: string,
    body: string,
    footer?: string,
    buttons?: Array<{
      type: string;
      reply: {
        id: string;
        title: string;
      }
    }>,
    sections?: Array<{
      title: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>
    }>
  ): Promise<any> {
    try {
      const interactive: any = {
        type: buttons ? 'button' : 'list',
        header: {
          type: 'text',
          text: header,
        },
        body: {
          text: body,
        },
        ...(footer && { footer: { text: footer } }),
      };

      if (buttons) {
        interactive.action = { buttons };
      } else if (sections) {
        interactive.action = { sections };
      }

      const response = await axios.post(
        `${this.getBaseUrl()}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'interactive',
          interactive,
        },
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to send WhatsApp interactive message: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.getBaseUrl()}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to mark WhatsApp message as read: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

// Export a singleton instance
export const whatsappClient = new WhatsAppClient();