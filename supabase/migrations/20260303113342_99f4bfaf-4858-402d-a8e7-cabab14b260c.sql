-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Service can update payments" ON public.payments;

-- Admins can update payments (M-Pesa callback uses service role key, bypassing RLS)
CREATE POLICY "Admins can update payments"
ON public.payments FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));