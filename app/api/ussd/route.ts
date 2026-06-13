import { NextRequest, NextResponse } from 'next/server';
import { africastalkingClient } from '@/lib/africastalking';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Store USSD sessions in memory for demo purposes
// In production, use Redis or database for session storage
interface USSDSession {
  phoneNumber: string;
  level: number;
  selectedOptions: string[];
  timestamp: number;
}

// Simple in-memory session store (NOT suitable for production)
const ussdSessions: Map<string, USSDSession> = new Map();

// Clean old sessions periodically (every hour)
// In production, use proper expiration mechanism
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of ussdSessions.entries()) {
    if (now - session.timestamp > 3600000) { // 1 hour
      ussdSessions.delete(sessionId);
    }
  }
}, 3600000);

export async function POST(request: NextRequest) {
  try {
    // Africa's Talking sends data as form-urlencoded
    const formData = await request.formData();

    const sessionId = formData.get('sessionId') as string;
    const serviceCode = formData.get('serviceCode') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const text = formData.get('text') as string; // User input

    // Get or create session
    let session = ussdSessions.get(sessionId);
    if (!session) {
      session = {
        phoneNumber,
        level: 0,
        selectedOptions: [],
        timestamp: Date.now(),
      };
      ussdSessions.set(sessionId, session);
    }

    // Parse user input to determine menu level and selection
    // USSD text format: "" for main menu, "1*" for first level selected, "1*2*" for second level, etc.
    const inputParts = text.split('*').filter(part => part !== '');
    const currentLevel = inputParts.length;

    // Update session based on input
    session.selectedOptions = inputParts;
    session.level = currentLevel;
    session.timestamp = Date.now();

    // Generate response based on current menu level
    let response = '';

    if (currentLevel === 0) {
      // Main menu
      response = `CON Welcome to Captain Compost\n`;
      response += `1. Check my account balance\n`;
      response += `2. Schedule waste collection\n`;
      response += `3. View my impact metrics\n`;
      response += `4. Buy composting products\n`;
      response += `5. Customer support\n`;
      response += `0. Exit`;
    } else if (currentLevel === 1) {
      // First level selection
      const selection = inputParts[0];

      switch (selection) {
        case '1':
          // Check account balance
          response = `CON Your account balance\n`;
          response += `1. M-Pesa balance\n`;
          response += `2. Loyalty points\n`;
          response += `3. View transaction history\n`;
          response += `0. Back to main menu`;
          break;

        case '2':
          // Schedule waste collection
          response = `CON Schedule waste collection\n`;
          response += `1. One-time pickup\n`;
          response += `2. Weekly schedule\n`;
          response += `3. Bi-weekly schedule\n`;
          response += `4. Monthly schedule\n`;
          response += `0. Back to main menu`;
          break;

        case '3':
          // View impact metrics
          response = `CON Your impact\n`;
          response += `1. Waste diverted this month\n`;
          response += `2. CO2 saved\n`;
          response += `3. Compost produced\n`;
          response += `4. Trees equivalent\n`;
          response += `0. Back to main menu`;
          break;

        case '4':
          // Buy products
          response = `CON Shop products\n`;
          response += `1. Home composters\n`;
          response += `2. Garden composters\n`;
          response += `3. Worm farms\n`;
          response += `4. Accessories\n`;
          response += `0. Back to main menu`;
          break;

        case '5':
          // Customer support
          response = `CON Customer Support\n`;
          response += `1. Call center\n`;
          response += `2. WhatsApp support\n`;
          response += `3. Email support\n`;
          response += `4. FAQ\n`;
          response += `0. Back to main menu`;
          break;

        case '0':
          // Exit
          response = `END Thank you for using Captain Compost. Goodbye!`;
          ussdSessions.delete(sessionId);
          break;

        default:
          response = `END Invalid selection. Please try again.`;
          ussdSessions.delete(sessionId);
          break;
      }
    } else if (currentLevel === 2) {
      // Second level selection
      const firstLevel = inputParts[0];
      const secondLevel = inputParts[1];

      // Handle different second level options based on first level selection
      if (firstLevel === '1') {
        // Account balance submenu
        if (secondLevel === '1') {
          response = `CON Your M-Pesa balance is KES 1,250.00\n`;
          response += `0. Back to account menu`;
        } else if (secondLevel === '2') {
          response = `CON You have 1,250 loyalty points\n`;
          response += `0. Back to account menu`;
        } else if (secondLevel === '3') {
          response = `CON Recent transactions:\n`;
          response += `1. 2024-01-15: Waste collection - KES 250\n`;
          response += `2. 2024-01-10: Compost purchase - KES 2,500\n`;
          response += `3. 2024-01-05: Loyalty points redeemed - 500 pts\n`;
          response += `0. Back to account menu`;
        } else if (secondLevel === '0') {
          // Back to main menu
          response = `CON Welcome to Captain Compost\n`;
          response += `1. Check my account balance\n`;
          response += `2. Schedule waste collection\n`;
          response += `3. View my impact metrics\n`;
          response += `4. Buy composting products\n`;
          response += `5. Customer support\n`;
          response += `0. Exit`;
        }
      } else if (firstLevel === '2') {
        // Schedule collection submenu
        if (['1', '2', '3', '4'].includes(secondLevel)) {
          const frequencyMap: Record<string, string> = {
            '1': 'One-time pickup',
            '2': 'Weekly schedule',
            '3': 'Bi-weekly schedule',
            '4': 'Monthly schedule'
          };
          response = `CON Select ${frequencyMap[secondLevel]} date\n`;
          response += `1. Today\n`;
          response += `2. Tomorrow\n`;
          response += `3. This weekend\n`;
          response += `4. Choose date\n`;
          response += `0. Back to schedule menu`;
        } else if (secondLevel === '0') {
          // Back to main menu
          response = `CON Welcome to Captain Compost\n`;
          response += `1. Check my account balance\n`;
          response += `2. Schedule waste collection\n`;
          response += `3. View my impact metrics\n`;
          response += `4. Buy composting products\n`;
          response += `5. Customer support\n`;
          response += `0. Exit`;
        }
      } else if (firstLevel === '3') {
        // Impact metrics submenu
        if (secondLevel === '1') {
          response = `CON You've diverted 125.5 kg of waste this month\n`;
          response += `0. Back to impact menu`;
        } else if (secondLevel === '2') {
          response = `CON You've saved 312.3 kg of CO2\n`;
          response += `0. Back to impact menu`;
        } else if (secondLevel === '3') {
          response = `CON You've produced 98.2 kg of compost\n`;
          response += `0. Back to impact menu`;
        } else if (secondLevel === '4') {
          response = `CON Equivalent to planting 3 trees\n`;
          response += `0. Back to impact menu`;
        } else if (secondLevel === '0') {
          // Back to main menu
          response = `CON Welcome to Captain Compost\n`;
          response += `1. Check my account balance\n`;
          response += `2. Schedule waste collection\n`;
          response += `3. View my impact metrics\n`;
          response += `4. Buy composting products\n`;
          response += `5. Customer support\n`;
          response += `0. Exit`;
        }
      } else if (firstLevel === '4') {
        // Products submenu
        if (['1', '2', '3', '4'].includes(secondLevel)) {
          const productMap: Record<string, {name: string; price: number}> = {
            '1': {name: 'Home Composter Basic', price: 2500},
            '2': {name: 'Garden Composter Deluxe', price: 5500},
            '3': {name: 'Worm Farm Kit', price: 3200},
            '4': {name: 'Accessories Bundle', price: 1800}
          };
          const product = productMap[secondLevel];
          response = `CON ${product.name} - KES ${product.price.toLocaleString()}\n`;
          response += `1. Buy now\n`;
          response += `2. More details\n`;
          response += `0. Back to products menu`;
        } else if (secondLevel === '0') {
          // Back to main menu
          response = `CON Welcome to Captain Compost\n`;
          response += `1. Check my account balance\n`;
          response += `2. Schedule waste collection\n`;
          response += `3. View my impact metrics\n`;
          response += `4. Buy composting products\n`;
          response += `5. Customer support\n`;
          response += `0. Exit`;
        }
      } else if (firstLevel === '5') {
        // Customer support submenu
        if (secondLevel === '1') {
          response = `CON Call our support center\n`;
          response += `📞 0700 000 000\n`;
          response += `0. Back to support menu`;
        } else if (secondLevel === '2') {
          response = `CON Chat with us on WhatsApp\n`;
          response += `📱 +254 700 000 001\n`;
          response += `0. Back to support menu`;
        } else if (secondLevel === '3') {
          response = `CON Email our support team\n`;
          response += `✉️ support@captaincompost.ke\n`;
          response += `0. Back to support menu`;
        } else if (secondLevel === '4') {
          response = `CON Frequently Asked Questions\n`;
          response += `1. How does composting work?\n`;
          response += `2. What materials can I compost?\n`;
          response += `3. How often should I collect?\n`;
          response += `0. Back to support menu`;
        } else if (secondLevel === '0') {
          // Back to main menu
          response = `CON Welcome to Captain Compost\n`;
          response += `1. Check my account balance\n`;
          response += `2. Schedule waste collection\n`;
          response += `3. View my impact metrics\n`;
          response += `4. Buy composting products\n`;
          response += `5. Customer support\n`;
          response += `0. Exit`;
        }
      } else {
        // Invalid selection
        response = `END Invalid selection. Please try again.`;
        ussdSessions.delete(sessionId);
      }
    } else if (currentLevel === 3) {
      // Third level selection - handle specific actions
      const firstLevel = inputParts[0];
      const secondLevel = inputParts[1];
      const thirdLevel = inputParts[2];

      // Handle third level actions based on the path
      if (firstLevel === '2' && secondLevel === '1' && ['1', '2', '3', '4'].includes(thirdLevel)) {
        // One-time pickup date selected
        const dateMap: Record<string, string> = {
          '1': 'Today',
          '2': 'Tomorrow',
          '3': 'This weekend',
          '4': 'Choose date'
        };
        response = `END Your ${dateMap[thirdLevel]} waste collection has been scheduled!\n`;
        response += `Our driver will contact you shortly.\n`;
        response += `Thank you for using Captain Compost!`;
        // TODO: Actually save the collection request to database
        ussdSessions.delete(sessionId);
      } else if (firstLevel === '4' && secondLevel === '1' && thirdLevel === '1') {
        // Product purchase confirmed
        response = `END Thank you for your purchase!\n`;
        response += `You will receive an SMS with payment instructions.\n`;
        response += `Please pay via M-Pesa to complete your order.\n`;
        // TODO: Actually create order and initiate payment
        ussdSessions.delete(sessionId);
      } else if (thirdLevel === '0') {
        // Go back to previous menu
        // Reconstruct the response based on first two levels
        const fakeText = `${firstLevel}*${secondLevel}`;
        // Reuse the logic from level 2 by temporarily setting text
        // For simplicity, we'll just go back to main menu in this example
        response = `CON Welcome to Captain Compost\n`;
        response += `1. Check my account balance\n`;
        response += `2. Schedule waste collection\n`;
        response += `3. View my impact metrics\n`;
        response += `4. Buy composting products\n`;
        response += `5. Customer support\n`;
        response += `0. Exit`;
      } else {
        // Default: go back to main menu for invalid paths
        response = `CON Welcome to Captain Compost\n`;
        response += `1. Check my account balance\n`;
        response += `2. Schedule waste collection\n`;
        response += `3. View my impact metrics\n`;
        response += `4. Buy composting products\n`;
        response += `5. Customer support\n`;
        response += `0. Exit`;
      }
    } else {
      // Default fallback
      response = `END Thank you for using Captain Compost.`;
      ussdSessions.delete(sessionId);
    }

    // Set appropriate headers for USSD response
    return new NextResponse(response, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('USSD processing error:', error);
    return new NextResponse(`END Service temporarily unavailable. Please try again later.`, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}