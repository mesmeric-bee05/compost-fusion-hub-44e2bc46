import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Initialize Prisma client
const prisma = new PrismaClient();

// Define schema for M-Pesa callback validation
const mpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z.object({
        Item: z.array(
          z.object({
            Name: z.string(),
            Value: z.union([z.number(), z.string()]),
          })
        ),
      }),
    }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the callback data
    const parsed = mpesaCallbackSchema.safeParse(body);
    if (!parsed.success) {
      console.error('Invalid M-Pesa callback data:', parsed.error);
      // Still return 200 to M-Pesa to prevent retries
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const callbackData = parsed.data.Body.stkCallback;
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callbackData;

    // Log the callback for debugging
    console.log('M-Pesa callback received:', {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
    });

    // If payment was successful (ResultCode 0), process the payment
    if (ResultCode === 0) {
      // Extract payment details from CallbackMetadata
      const items = CallbackMetadata.Item.reduce((acc: Record<string, any>, item) => {
        acc[item.Name] = item.Value;
        return acc;
      }, {});

      const amount = items.Amount;
      const mpesaReceiptNumber = items.MpesaReceiptNumber;
      const transactionDate = items.TransactionDate;
      const phoneNumber = items.PhoneNumber;

      // Here you would typically:
      // 1. Find the pending payment/order associated with CheckoutRequestID
      // 2. Update the payment status to completed
      // 3. Update order status
      // 4. Send confirmation to user
      // 5. Award points/rewards if applicable

      // For now, we'll just log the successful payment
      console.log('Successful M-Pesa payment:', {
        amount,
        mpesaReceiptNumber,
        transactionDate,
        phoneNumber,
      });

      // TODO: Update database with payment completion
      // Example:
      // await prisma.payment.updateMany({
      //   where: { mpesaRequestId: CheckoutRequestID },
      //   data: {
      //     status: 'PAID',
      //     mpesaReceiptNo: mpesaReceiptNumber,
      //     confirmedAt: new Date(),
      //   },
      // });
    } else {
      // Payment failed or was cancelled
      console.log('M-Pesa payment failed or cancelled:', {
        ResultCode,
        ResultDesc,
        CheckoutRequestID,
      });

      // TODO: Update database with payment failure
      // Example:
      // await prisma.payment.updateMany({
      //   where: { mpesaRequestId: CheckoutRequestID },
      //   data: {
      //     status: 'FAILED',
      //   },
      // });
    }

    // Always return success to M-Pesa to prevent retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error: any) {
    console.error('Error processing M-Pesa callback:', error);
    // Still return 200 to M-Pesa to prevent retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}

// Handle GET requests for verification (if needed)
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'M-Pesa callback endpoint' });
}