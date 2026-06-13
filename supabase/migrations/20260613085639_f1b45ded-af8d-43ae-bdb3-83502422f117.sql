
-- 1) Payments: tighten SELECT policies. Remove broad admin SELECT (was {public}) and
--    the dead "Users can view own payments (no secrets)" policy. Authenticated admins
--    keep read access via the existing "Admins view full payments" policy.
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments (no secrets)" ON public.payments;

-- Replace the admin full-row read with a policy that only the service role can
-- use to read sensitive columns (callback_token, mpesa_merchant_request_id).
-- Admin dashboard reads should go through the payments_safe view.
DROP POLICY IF EXISTS "Admins view full payments" ON public.payments;
CREATE POLICY "Service role reads full payments"
  ON public.payments FOR SELECT
  TO service_role
  USING (true);

-- 2) user_badges: remove anon access; expose counts via RPC.
DROP POLICY IF EXISTS "Anyone can view badges for leaderboard" ON public.user_badges;

CREATE OR REPLACE FUNCTION public.get_leaderboard_badge_counts(_user_ids uuid[])
RETURNS TABLE(user_id uuid, badge_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ub.user_id, COUNT(*)::bigint
  FROM public.user_badges ub
  WHERE ub.user_id = ANY(_user_ids)
  GROUP BY ub.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard_badge_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_badge_counts(uuid[]) TO authenticated;

-- 3) Revoke EXECUTE on internal trigger function from anon/authenticated.
REVOKE ALL ON FUNCTION public.block_non_service_ussd_writes() FROM PUBLIC, anon, authenticated;
