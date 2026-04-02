
-- USSD sessions table
CREATE TABLE public.ussd_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  phone_number text NOT NULL,
  menu_state text DEFAULT 'MAIN',
  session_data jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ussd_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ussd sessions"
ON public.ussd_sessions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert sessions"
ON public.ussd_sessions FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Service can select sessions"
ON public.ussd_sessions FOR SELECT
TO anon
USING (true);

CREATE POLICY "Service can update sessions"
ON public.ussd_sessions FOR UPDATE
TO anon
USING (true);

-- Contact submissions table
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  interest text DEFAULT 'general',
  county text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage contact submissions"
ON public.contact_submissions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
