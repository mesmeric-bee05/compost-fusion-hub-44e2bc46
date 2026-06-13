import { NextRequest, NextResponse } from 'next/server';
import { mpesaClient } from '@/lib/mpesa';
import { z } from 'zod';

// Define validation schema for STK push request
const stkPushSchema = z.object({
  phoneNumber: z.string().regex(/^(\+254|0)?[1-9][0-9]{8}$/, 'Invalid phone number format'),
  amount: z.number().positive('Amount must be a positive number'),
  accountReference: z.string().min(1, 'Account reference is required'),
  transactionDesc: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input using Zod
    const validationResult = stkPushSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { phoneNumber, amount, accountReference, transactionDesc } = validationResult.data;

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