
-- 1) Email idempotency log
CREATE TABLE IF NOT EXISTS public.order_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  resend_id text,
  UNIQUE (order_id, status)
);

GRANT ALL ON public.order_email_log TO service_role;
ALTER TABLE public.order_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email log"
  ON public.order_email_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Harden payments INSERT: must own the order
DROP POLICY IF EXISTS "Users can create payments" ON public.payments;
CREATE POLICY "Users can create payments for own orders"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id AND o.user_id = auth.uid()
    )
  );

-- 3) Allow assigned driver to read the payment row for their delivery
CREATE POLICY "Drivers can view assigned order payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id AND o.driver_id = auth.uid()
    )
  );

-- 4) Lock down direct writes on order_status_history (writes only via trigger / service_role)
DROP POLICY IF EXISTS "Deny direct insert on order_status_history" ON public.order_status_history;
CREATE POLICY "Deny direct insert on order_status_history"
  ON public.order_status_history
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct update on order_status_history" ON public.order_status_history;
CREATE POLICY "Deny direct update on order_status_history"
  ON public.order_status_history
  FOR UPDATE
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Deny direct delete on order_status_history" ON public.order_status_history;
CREATE POLICY "Deny direct delete on order_status_history"
  ON public.order_status_history
  FOR DELETE
  TO anon, authenticated
  USING (false);
