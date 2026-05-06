
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_count integer NOT NULL DEFAULT 0,
  target_emails text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_admin_audit_log_admin_created ON public.admin_audit_log (admin_id, created_at DESC);
CREATE INDEX idx_admin_audit_log_action_created ON public.admin_audit_log (action, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_admin_action(
  _admin_id uuid,
  _action text,
  _emails text[],
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _capped text[];
BEGIN
  IF NOT public.has_role(_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF array_length(_emails, 1) > 50 THEN
    _capped := _emails[1:50];
  ELSE
    _capped := COALESCE(_emails, '{}');
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_count, target_emails, metadata)
  VALUES (
    _admin_id,
    _action,
    COALESCE(array_length(_emails, 1), 0),
    _capped,
    COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;
