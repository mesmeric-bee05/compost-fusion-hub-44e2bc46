
CREATE TABLE public.payment_email_resend_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  admin_id uuid NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_per_attempts_order_status_time
  ON public.payment_email_resend_attempts (order_id, status, attempted_at DESC);

GRANT SELECT ON public.payment_email_resend_attempts TO authenticated;
GRANT ALL ON public.payment_email_resend_attempts TO service_role;

ALTER TABLE public.payment_email_resend_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read resend attempts"
  ON public.payment_email_resend_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.check_email_resend_rate(_order uuid, _status text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last_at timestamptz;
  _attempts_window int;
  _cooldown_seconds int := 30;
  _window_max int := 3;
  _window interval := interval '60 minutes';
  _retry_after int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT max(attempted_at) INTO _last_at
  FROM public.payment_email_resend_attempts
  WHERE order_id = _order AND status = _status;

  SELECT count(*) INTO _attempts_window
  FROM public.payment_email_resend_attempts
  WHERE order_id = _order AND status = _status
    AND attempted_at > now() - _window;

  IF _last_at IS NOT NULL AND _last_at > now() - make_interval(secs => _cooldown_seconds) THEN
    _retry_after := GREATEST(1, _cooldown_seconds - EXTRACT(EPOCH FROM (now() - _last_at))::int);
    RETURN json_build_object(
      'allowed', false,
      'reason', 'cooldown',
      'retry_after_seconds', _retry_after,
      'attempts_in_window', _attempts_window
    );
  END IF;

  IF _attempts_window >= _window_max THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'window_exceeded',
      'retry_after_seconds', EXTRACT(EPOCH FROM _window)::int,
      'attempts_in_window', _attempts_window
    );
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'attempts_in_window', _attempts_window
  );
END;
$$;

CREATE INDEX IF NOT EXISTS idx_admin_audit_metadata_order
  ON public.admin_audit_log ((metadata->>'order_id'));
