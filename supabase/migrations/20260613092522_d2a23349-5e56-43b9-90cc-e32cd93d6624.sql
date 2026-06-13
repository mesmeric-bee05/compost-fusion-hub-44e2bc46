
CREATE TABLE public.api_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  bucket_key TEXT NOT NULL,
  hit_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_rate_limits_bucket_time
  ON public.api_rate_limits (bucket_key, hit_at DESC);

GRANT ALL ON public.api_rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.api_rate_limits_id_seq TO service_role;

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated => locked down. Service role bypasses RLS.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket_key TEXT,
  _window_seconds INT,
  _max_hits INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INT;
  _cutoff TIMESTAMPTZ := now() - make_interval(secs => _window_seconds);
BEGIN
  -- Opportunistic prune of stale rows for this bucket (keeps table tiny).
  DELETE FROM public.api_rate_limits
   WHERE bucket_key = _bucket_key AND hit_at < _cutoff;

  SELECT count(*) INTO _count
    FROM public.api_rate_limits
   WHERE bucket_key = _bucket_key AND hit_at >= _cutoff;

  IF _count >= _max_hits THEN
    RETURN json_build_object(
      'allowed', false,
      'count', _count,
      'retry_after_seconds', _window_seconds
    );
  END IF;

  INSERT INTO public.api_rate_limits (bucket_key) VALUES (_bucket_key);

  RETURN json_build_object('allowed', true, 'count', _count + 1);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;
