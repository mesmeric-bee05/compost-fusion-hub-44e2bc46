import { whatsappClient } from '@/lib/whatsapp';

/**
 * Send WhatsApp notification for order confirmation
 */
export async function sendOrderConfirmation(
  phoneNumber: string,
  orderId: string,
  amount: number,
  items: Array<{ name: string; quantity: number; price: number }>
): Promise<void> {
  try {
    const itemsText = items
      .map(item => `- ${item.name} (x${item.quantity}): KES ${(item.price * item.quantity).toLocaleString()}`)
      .join('\n');

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    await whatsappClient.sendTemplateMessage(
      phoneNumber,
      'order_confirmation', // This assumes you have a template approved by WhatsApp
      'en',
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: orderId },
            { type: 'text', text: new Date().toLocaleDateString() },
            { type: 'text', text: itemsText },
            { type: 'text', text: total.toLocaleString() },
          ],
        },
      ]
    );
  } catch (error) {
    console.error('Failed to send order confirmation WhatsApp message:', error);
    // Fallback to text message if template fails
    try {
      await whatsappClient.sendTextMessage(
        phoneNumber,
        `Thank you for your order #${orderId}!\n\nItems:\n${itemsText}\n\nTotal: KES ${total.toLocaleString()}\n\nWe'll notify you when your order is ready for pickup or delivery.`
      );
    } catch (fallbackError) {
      console.error('Failed to send fallback WhatsApp message:', fallbackError);
    }
  }
}

/**
 * Send WhatsApp notification for waste collection reminder
 */
export async function sendCollectionReminder(
  phoneNumber: string,
  collectionDate: string,
  collectionTime: string,
  address: string
): Promise<void> {
  try {
    await whatsappClient.sendTemplateMessage(
      phoneNumber,
      'collection_reminder', // Assumes approved template
      'en',
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: collectionDate },
            { type: 'text', text: collectionTime },
            { type: 'text', text: address },
          ],
        },
      ]
    );
  } catch (error) {
    console.error('Failed to send collection reminder WhatsApp message:', error);
    // Fallback to text message
    try {
      await whatsappClient.sendTextMessage(
        phoneNumber,
        `Reminder: You have a waste collection scheduled for ${collectionDate} at ${collectionTime}.\n\nAddress: ${address}\n\nPlease have your waste ready for pickup.`
      );
    } catch (fallbackError) {
      console.error('Failed to send fallback WhatsApp message:', fallbackError);
    }
  }
}

/**
 * Send WhatsApp notification for impact update
 */
export async function sendImpactUpdate(
  phoneNumber: string,
  period: string,
  wasteDiverted: number,
  co2Saved: number,
  compostProduced: number
): Promise<void> {
  try {
    await whatsappClient.sendTemplateMessage(
      phoneNumber,
      'impact_update', // Assumes approved template
      'en',
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: period },
            { type: 'text', text: wasteDiverted.toLocaleString() },
            { type: 'text', text: co2Saved.toLocaleString() },
            { type: 'text', text: compostProduced.toLocaleString() },
          ],
        },
      ]
    );
  } catch (error) {
    console.error('Failed to send impact update WhatsApp message:', error);
    // Fallback to text message
    try {
      await whatsappClient.sendTextMessage(
        phoneNumber,
        `Your Captain Compost impact update for ${period}:\n\n🗑️ Waste diverted: ${wasteDiverted.toLocaleString()} kg\n💨 CO2 saved: ${co2Saved.toLocaleString()} kg\n🌱 Compost produced: ${compostProduced.toLocaleString()} kg\n\nThank you for making a difference!`
      );
    } catch (fallbackError) {
      console.error('Failed to send fallback WhatsApp message:', fallbackError);
    }
  }
}