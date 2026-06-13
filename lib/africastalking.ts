import axios from 'axios';

// Africa's Talking API client
export class AfricastalkingClient {
  private username: string;
  private apiKey: string;
  private shortCode: string;

  constructor() {
    this.username = process.env.AFRICASTALKING_USERNAME!;
    this.apiKey = process.env.AFRICASTALKING_API_KEY!;
    this.shortCode = process.env.AFRICASTALKING_SHORT_CODE!;
  }

  private getHeaders() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      apiKey: this.apiKey,
    };
  }

  /**
   * Send SMS via Africa's Talking
   */
  async sendSMS(
    to: string,
    message: string,
    from?: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        'https://api.africastalking.com/version1/messaging',
        new URLSearchParams({
          username: this.username,
          to,
          message,
          ...(from && { from }),
        }).toString(),
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to send SMS: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  /**
   * Process USSD request and generate response
   * This method would typically be called from your USSD webhook endpoint
   */
  async handleUssdRequest(
    sessionId: string,
    serviceCode: string,
    phoneNumber: string,
    text: string
  ): Promise<string> {
    // This is where you implement your USSD menu logic
    // For now, we'll return a simple menu
    // In a real implementation, you'd parse the 'text' parameter to determine
    // what menu level the user is at and respond accordingly

    // Default response - main menu
    let response = `CON Welcome to Captain Compost\n`;
    response += `1. Check my account balance\n`;
    response += `2. Schedule waste collection\n`;
    response += `3. View my impact metrics\n`;
    response += `4. Buy composting products\n`;
    response += `0. Speak to agent`;

    // TODO: Implement actual menu logic based on session state
    // You would typically store session state in a database or cache (Redis)
    // and use the 'text' parameter to navigate the menu

    return response;
  }

  /**
   * Initiate USSD push (send unsolicited USSD to user)
   * Note: This requires special approval from Africa's Talking and Safaricom
   */
  async pushUssd(
    phoneNumber: string,
    message: string,
    from?: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        'https://api.africastalking.com/version1/ussd',
        new URLSearchParams({
          username: this.username,
          to: phoneNumber,
          message,
          ...(from && { from }),
        }).toString(),
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to push USSD: ${error.response?.data?.errorMessage || error.message}`);
    }
  }
}

// Export a singleton instance
export const africastalkingClient = new AfricastalkingClient();