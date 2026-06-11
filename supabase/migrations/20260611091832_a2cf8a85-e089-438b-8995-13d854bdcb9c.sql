
-- ============================================================
-- A. Hide sensitive columns on payments via a safe view
-- ============================================================
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;

CREATE POLICY "Users can view own payments (no secrets)"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND false); -- block direct access to base table

-- Re-allow admins to view full base table
CREATE POLICY "Admins view full payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Safe view exposing only non-sensitive columns
CREATE OR REPLACE VIEW public.payments_safe
WITH (security_invoker = true)
AS
SELECT id, order_id, user_id, phone_number, amount, status,
       mpesa_receipt_number, result_code, result_description,
       mpesa_checkout_request_id, created_at, updated_at
FROM public.payments
WHERE auth.uid() = user_id
   OR public.has_role(auth.uid(), 'admin'::app_role);

GRANT SELECT ON public.payments_safe TO authenticated;

-- Allow service role full access (unchanged)
-- ============================================================
-- B. Revoke EXECUTE on trigger-only / internal SECURITY DEFINER fns
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_order_status_change()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_order_initial_status()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_status_change()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_collection_status_change()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_reward_change()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification_preferences()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_stock_on_confirm()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text[], jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_email_resend_rate(uuid, text)        FROM PUBLIC, anon;

-- ============================================================
-- C. USSD sessions: block direct writes from authenticated users
-- ============================================================
CREATE OR REPLACE FUNCTION public.block_non_service_ussd_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) NOT IN ('service_role','postgres','supabase_admin') THEN
    RAISE EXCEPTION 'ussd_sessions writes restricted to backend';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ussd_sessions_block_writes ON public.ussd_sessions;
CREATE TRIGGER ussd_sessions_block_writes
  BEFORE INSERT OR UPDATE OR DELETE ON public.ussd_sessions
  FOR EACH ROW EXECUTE FUNCTION public.block_non_service_ussd_writes();

-- ============================================================
-- D. Realtime: enable RLS and restrict subscriptions by topic
-- ============================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth users read own topics" ON realtime.messages;

CREATE POLICY "auth users read own topics"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR realtime.topic() LIKE ('notifications-' || auth.uid()::text || '%')
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.user_id = auth.uid()
        AND (
          realtime.topic() = ('order-' || o.id::text)
          OR realtime.topic() LIKE ('payment-' || o.id::text || '%')
        )
    )
  );
