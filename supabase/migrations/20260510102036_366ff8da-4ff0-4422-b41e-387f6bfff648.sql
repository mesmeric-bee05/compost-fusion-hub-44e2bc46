
-- Search USSD sessions (admin only)
CREATE OR REPLACE FUNCTION public.search_ussd_sessions(
  _q text DEFAULT NULL,
  _state text DEFAULT NULL,
  _active boolean DEFAULT NULL,
  _limit integer DEFAULT 25,
  _offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  session_id text,
  phone_number text,
  menu_state text,
  is_active boolean,
  session_data jsonb,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lim int := LEAST(GREATEST(COALESCE(_limit, 25), 1), 200);
  _off int := GREATEST(COALESCE(_offset, 0), 0);
  _qq text := NULLIF(TRIM(COALESCE(_q, '')), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT s.*
    FROM public.ussd_sessions s
    WHERE (_qq IS NULL OR s.phone_number ILIKE '%' || _qq || '%' OR s.session_id ILIKE '%' || _qq || '%')
      AND (_state IS NULL OR s.menu_state = _state)
      AND (_active IS NULL OR s.is_active = _active)
  ),
  counted AS (SELECT COUNT(*)::bigint AS total FROM filtered)
  SELECT f.id, f.session_id, f.phone_number, f.menu_state, f.is_active,
         f.session_data, f.created_at, c.total
  FROM filtered f, counted c
  ORDER BY f.created_at DESC
  LIMIT _lim OFFSET _off;
END;
$$;

REVOKE ALL ON FUNCTION public.search_ussd_sessions(text, text, boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_ussd_sessions(text, text, boolean, integer, integer) TO authenticated;

-- Detail lookup
CREATE OR REPLACE FUNCTION public.get_ussd_session_detail(_session_id text)
RETURNS TABLE (
  id uuid,
  session_id text,
  phone_number text,
  menu_state text,
  is_active boolean,
  session_data jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  RETURN QUERY
    SELECT s.id, s.session_id, s.phone_number, s.menu_state, s.is_active,
           s.session_data, s.created_at
    FROM public.ussd_sessions s
    WHERE s.session_id = _session_id
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ussd_session_detail(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ussd_session_detail(text) TO authenticated;
