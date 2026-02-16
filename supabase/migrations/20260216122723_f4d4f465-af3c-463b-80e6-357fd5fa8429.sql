
-- Fix the permissive INSERT policies for profiles and user_roles
-- These are only needed for the auth trigger, so restrict to service_role
DROP POLICY "Allow insert for trigger" ON public.profiles;
DROP POLICY "Allow insert for trigger" ON public.user_roles;

-- The trigger runs as SECURITY DEFINER so it bypasses RLS.
-- Users should only be able to read/update their own profile, not insert directly.
-- No public INSERT policy needed since the trigger handles it.
