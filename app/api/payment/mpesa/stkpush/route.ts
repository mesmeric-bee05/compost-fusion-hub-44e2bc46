import { NextRequest, NextResponse } from 'next/server';
import { mpesaClient } from '@/lib/mpesa';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, amount, accountReference, transactionDesc } = await request.json();

    // Validate input
    if (!phoneNumber || !amount || !accountReference) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumber, amount, accountReference' },
        { status: 400 }
      );
    }

    // Validate amount is positive number
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^(\+254|0)?[1-9][0-9]{8}$/;
    if (!phoneRegex.match(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Initiate STK push
    const result = await mpesaClient.initiateStkPush(
      phoneNumber,
      amount,
      accountReference,
      transactionDesc || 'Payment for Captain Compost services'
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('M-Pesa STK push error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}