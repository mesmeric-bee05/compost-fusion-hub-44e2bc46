
-- 1. Deny direct writes on admin_audit_log (defense in depth; only log_admin_action SECURITY DEFINER writes)
CREATE POLICY "Deny direct insert on audit log"
  ON public.admin_audit_log FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "Deny direct update on audit log"
  ON public.admin_audit_log FOR UPDATE TO authenticated, anon
  USING (false);

CREATE POLICY "Deny direct delete on audit log"
  ON public.admin_audit_log FOR DELETE TO authenticated, anon
  USING (false);

-- 2. Tighten get_leaderboard_profiles execute grants & cap input
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_profiles(uuid[]) TO authenticated;

-- Wrap with a guard via a new function (keeps original for compat) -- actually just replace body to cap
CREATE OR REPLACE FUNCTION public.get_leaderboard_profiles(user_ids uuid[])
 RETURNS TABLE(user_id uuid, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  WHERE p.user_id = ANY(user_ids)
  LIMIT 200;
$function$;

-- 3. Admin-only function for resolving admin display names in audit log
CREATE OR REPLACE FUNCTION public.get_audit_admin_names(user_ids uuid[])
 RETURNS TABLE(user_id uuid, full_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.full_name
    FROM public.profiles p
    WHERE p.user_id = ANY(user_ids)
    LIMIT 200;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_audit_admin_names(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_admin_names(uuid[]) TO authenticated;

-- 4. search_audit_log RPC (admin-only) supporting partial + multi-exact email match
CREATE OR REPLACE FUNCTION public.search_audit_log(
  _action text DEFAULT NULL,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _email_query text DEFAULT NULL,
  _emails text[] DEFAULT NULL,
  _mode text DEFAULT 'contains',
  _limit int DEFAULT 25,
  _offset int DEFAULT 0
)
 RETURNS TABLE(
   id uuid,
   admin_id uuid,
   action text,
   target_count int,
   target_emails text[],
   metadata jsonb,
   created_at timestamptz,
   total_count bigint
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _lim int := LEAST(GREATEST(COALESCE(_limit, 25), 1), 200);
  _off int := GREATEST(COALESCE(_offset, 0), 0);
  _q text := NULLIF(LOWER(TRIM(COALESCE(_email_query, ''))), '');
  _emails_lc text[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF _emails IS NOT NULL THEN
    SELECT ARRAY(SELECT LOWER(TRIM(e)) FROM unnest(_emails) e WHERE LENGTH(TRIM(e)) > 0)
      INTO _emails_lc;
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT a.*
    FROM public.admin_audit_log a
    WHERE (_action IS NULL OR a.action = _action)
      AND (_from IS NULL OR a.created_at >= _from)
      AND (_to IS NULL OR a.created_at <= _to)
      AND (
        _mode = 'multi-exact'
          AND _emails_lc IS NOT NULL
          AND array_length(_emails_lc, 1) > 0
          AND a.target_emails && _emails_lc
        OR _mode = 'contains'
          AND (_q IS NULL OR EXISTS (
            SELECT 1 FROM unnest(a.target_emails) e WHERE LOWER(e) LIKE '%' || _q || '%'
          ))
        OR (_mode NOT IN ('contains','multi-exact'))
      )
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS total FROM filtered
  )
  SELECT f.id, f.admin_id, f.action, f.target_count, f.target_emails, f.metadata, f.created_at,
         c.total AS total_count
  FROM filtered f, counted c
  ORDER BY f.created_at DESC
  LIMIT _lim OFFSET _off;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.search_audit_log(text, timestamptz, timestamptz, text, text[], text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_audit_log(text, timestamptz, timestamptz, text, text[], text, int, int) TO authenticated;
