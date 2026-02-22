
-- Create payments table to track M-Pesa transactions
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  phone_number text NOT NULL,
  amount numeric NOT NULL,
  mpesa_checkout_request_id text,
  mpesa_merchant_request_id text,
  mpesa_receipt_number text,
  status text NOT NULL DEFAULT 'pending',
  result_code integer,
  result_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

-- Users can create payments for their orders
CREATE POLICY "Users can create payments"
ON public.payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can update payment status (via callback)
CREATE POLICY "Service can update payments"
ON public.payments FOR UPDATE
USING (true);

-- Auto-update timestamp trigger
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookup by checkout request ID
CREATE INDEX idx_payments_checkout_request ON public.payments(mpesa_checkout_request_id);
