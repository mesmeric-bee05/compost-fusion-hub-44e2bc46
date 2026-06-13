import { NextRequest, NextResponse } from 'next/server';
import { whatsappClient } from '@/lib/whatsapp';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Verify token for webhook setup
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Check if mode and token are present
    if (mode && token) {
      // Verify the mode and token
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        // Respond with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        return new NextResponse(challenge ?? '', {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      } else {
        // Respond with '403 Forbidden' if verify token does not match
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    // If neither mode nor token is present, return a simple message
    return new NextResponse('Hello, I am the WhatsApp webhook endpoint.', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('Webhook verification error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received WhatsApp webhook:', JSON.stringify(body, null, 2));

    // Handle WhatsApp Business API webhook payload
    // https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples

    if (body.object === 'whatsapp_business_account') {
      // Process each entry
      for (const entry of body.entry) {
        // Each entry contains a 'changes' field with an array of change objects
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            // Handle incoming messages
            await handleMessages(change.value);
          }
        }
      }
    }

    // Return a 200 OK response to acknowledge receipt
    return new NextResponse('EVENT_RECEIVED', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('Error processing WhatsApp webhook:', error);
    // Still return 200 to prevent webhook retries
    return new NextResponse('EVENT_RECEIVED', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

async function handleMessages(value: any) {
  try {
    // Process incoming messages
    if (!value.messages) {
      return;
    }

    for (const message of value.messages) {
      const { from, id, timestamp, type } = message;
      const phoneNumber = from; // WhatsApp number of the user

      // Mark message as read
      await whatsappClient.markAsRead(id);

      // Process different message types
      switch (type) {
        case 'text':
          await handleTextMessage(phoneNumber, message.text.body, id);
          break;

        case 'interactive':
          await handleInteractiveMessage(phoneNumber, message.interactive, id);
          break;

        case 'button':
          await handleButtonMessage(phoneNumber, message.button, id);
          break;

        default:
          console.log(`Unsupported message type: ${type}`);
          // Send a helpful message for unsupported types
          await whatsappClient.sendTextMessage(
            phoneNumber,
            'Sorry, I can only process text messages at the moment. Please send a text message.'
          );
          break;
      }
    }
  } catch (error: any) {
    console.error('Error handling WhatsApp messages:', error);
  }
}

async handleTextMessage(from: string, text: string, messageId: string) {
  try {
    // Convert to lowercase and trim for easier matching
    const command = text.toLowerCase().trim();

    // Define commands and their responses
    if (command.startsWith('hello') || command.startsWith('hi')) {
      await whatsappClient.sendTextMessage(
        from,
        'Hello! Welcome to Captain Compost. How can I help you today?\n\nYou can:\n1. Check your account balance\n2. Schedule a waste collection\n3. View your impact\n4. Buy composting products\n\nJust type the number or keyword for what you want to do.'
      );
    } else if (command.includes('balance') || command === '1') {
      // This would typically fetch real data from the database
      await whatsappClient.sendTextMessage(
        from,
        'Your Captain Compost account:\n\n💰 M-Pesa Balance: KES 1,250.00\n🏆 Loyalty Points: 1,250 pts\n\nLast transaction: Waste collection on 2024-01-15 - KES 250'
      );
    } else if (command.includes('schedule') || command.includes('collection') || command === '2') {
      await whatsappClient.sendTextMessage(
        from,
        'To schedule a waste collection:\n\n1. One-time pickup\n2. Weekly schedule\n3. Bi-weekly schedule\n4. Monthly schedule\n\nReply with the number of your choice.'
      );
    } else if (command.includes('impact') || command === '3') {
      await whatsappClient.sendTextMessage(
        from,
        'Your environmental impact:\n\n🗑️ Waste diverted this month: 125.5 kg\n💨 CO2 saved: 312.3 kg\n🌱 Compost produced: 98.2 kg\n🌳 Trees equivalent: 3\n\nKeep up the great work!'
      );
    } else if (command.includes('buy') || command.includes('shop') || command.includes('product') || command === '4') {
      await whatsappClient.sendTextMessage(
        from,
        'Our products:\n\n1. Home Composter Basic - KES 2,500\n2. Garden Composter Deluxe - KES 5,500\n3. Worm Farm Kit - KES 3,200\n4. Accessories Bundle - KES 1,800\n\nReply with the number of the product you want to purchase.'
      );
    } else if (command.includes('help') || command.includes('support')) {
      await whatsappClient.sendTextMessage(
        from,
        'Need help?\n\n📞 Call: 0700 000 000\n📱 WhatsApp: You\'re already here!)\n✉️ Email: support@captaincompost.ke\n\nOur support team is available Monday-Friday, 8am-5pm EAT.'
      );
    } else {
      // Default response for unrecognized commands
      await whatsappClient.sendTextMessage(
        from,
        'Sorry, I didn\'t understand that. Please try one of these:\n\n• "Hello" or "Hi" to start\n• "Balance" or "1" to check your account\n• "Schedule" or "2" to book a collection\n• "Impact" or "3" to view your environmental impact\n• "Buy" or "4" to shop our products\n• "Help" or "Support" for assistance'
      );
    }
  } catch (error: any) {
    console.error('Error handling text message:', error);
    // Send error message to user
    try {
      await whatsappClient.sendTextMessage(
        from,
        'Sorry, something went wrong. Please try again later.'
      );
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }
}

async handleInteractiveMessage(from: string, interactive: any, messageId: string) {
  try {
    const { type, button_reply, list_reply } = interactive;

    let response = '';

    if (type === 'button' && button_reply) {
      const { id, title } = button_reply;
      response = `You selected: ${title}`;
      // Handle specific button actions
      if (id === 'check_balance') {
        // Would fetch real balance
        response += '\n\nYour account balance is KES 1,250.00 with 1,250 loyalty points.';
      } else if (id === 'schedule_collection') {
        response += '\n\nPlease reply with your preferred schedule:';
        response += '\n1. One-time pickup';
        response += '\n2. Weekly schedule';
        response += '\n3. Bi-weekly schedule';
        response += '\n4. Monthly schedule';
      }
    } else if (type === 'list' && list_reply) {
      const { id, title } = list_reply;
      response = `You selected: ${title}`;
      // Handle specific list selections
      // This would be expanded based on your menu structure
    }

    await whatsappClient.sendTextMessage(from, response);
  } catch (error: any) {
    console.error('Error handling interactive message:', error);
  }
}

async handleButtonMessage(from: string, button: any, messageId: string) {
  try {
    const { text, payload } = button;
    // Handle button responses from previous interactive messages
    await whatsappClient.sendTextMessage(from, `You pressed: ${text}`);
  } catch (error: any) {
    console.error('Error handling button message:', error);
  }
}