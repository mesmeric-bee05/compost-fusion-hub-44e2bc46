-- 1. Add payments to the realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.payments';
  END IF;
END $$;

ALTER TABLE public.payments REPLICA IDENTITY FULL;

-- 2. Admin-only DELETE policy on order_email_log (enables resend by clearing the idempotency claim)
DROP POLICY IF EXISTS "Admins can delete order email log rows" ON public.order_email_log;
CREATE POLICY "Admins can delete order email log rows"
  ON public.order_email_log
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT DELETE ON public.order_email_log TO authenticated;