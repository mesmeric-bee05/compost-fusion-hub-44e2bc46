import { useState, useCallback } from 'react';

export interface MpesaSTKPushParams {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc?: string;
}

export interface MpesaSTKPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaSTKPushError {
  message: string;
}

/**
 * Hook for initiating M-Pesa STK push payments
 */
export const useMpesa = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<MpesaSTKPushError | null>(null);
  const [result, setResult] = useState<MpesaSTKPushResult | null>(null);

  const initiateStkPush = useCallback(
    async (params: MpesaSTKPushParams): Promise<MpesaSTKPushResult | null> => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const response = await fetch('/api/payment/mpesa/stkpush', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to initiate payment');
        }

        setResult(data);
        return data;
      } catch (err: any) {
        setError({ message: err.message || 'An unknown error occurred' });
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    initiateStkPush,
    loading,
    error,
    result,
    reset,
  };
};