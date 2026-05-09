
-- 1) ussd_sessions: drop overly permissive anon policies
DROP POLICY IF EXISTS "Service can insert sessions" ON public.ussd_sessions;
DROP POLICY IF EXISTS "Service can select own session" ON public.ussd_sessions;
DROP POLICY IF EXISTS "Service can update own session" ON public.ussd_sessions;

-- 2) newsletter_subscribers: bound the public insert
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe"
ON public.newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(email) BETWEEN 3 AND 254
  AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);

-- 3) contact_submissions: bound the public insert
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(name) BETWEEN 1 AND 200
  AND length(message) BETWEEN 1 AND 5000
  AND (email IS NULL OR (length(email) BETWEEN 3 AND 254 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
);

-- 4) Storage: drop broad public-listing SELECT policies on public buckets.
-- Public buckets remain serving via CDN by direct URL; only listing is removed.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (
        qual ILIKE '%product-images%'
        OR qual ILIKE '%review-images%'
        OR qual ILIKE '%content-images%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 5) SECURITY DEFINER hardening:
-- Revoke EXECUTE from PUBLIC/anon/authenticated on ALL public definer functions,
-- then re-grant only the legitimate RPCs to authenticated.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
                   fn.schema, fn.name, fn.args);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_coupon(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_audit_log(text, timestamptz, timestamptz, text, text[], text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_admin_names(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_profiles(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text[], jsonb) TO authenticated;
