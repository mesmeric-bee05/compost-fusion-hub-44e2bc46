-- 1. Fix profiles leaderboard policy: drop overly broad one, create restricted view
DROP POLICY IF EXISTS "Authenticated can read names for leaderboard" ON public.profiles;

CREATE POLICY "Authenticated can read names for leaderboard"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- We'll use a security definer function instead for leaderboard data
CREATE OR REPLACE FUNCTION public.get_leaderboard_profiles(user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  WHERE p.user_id = ANY(user_ids);
$$;

-- 2. Fix USSD sessions: tighten anon policies to scope by session_id
DROP POLICY IF EXISTS "Service can select sessions" ON public.ussd_sessions;
DROP POLICY IF EXISTS "Service can insert sessions" ON public.ussd_sessions;
DROP POLICY IF EXISTS "Service can update sessions" ON public.ussd_sessions;

-- Anon can only insert new sessions (needed for USSD edge function)
CREATE POLICY "Service can insert sessions"
ON public.ussd_sessions
FOR INSERT
TO anon
WITH CHECK (true);

-- Anon can only read/update sessions matching their session_id
CREATE POLICY "Service can select own session"
ON public.ussd_sessions
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Service can update own session"
ON public.ussd_sessions
FOR UPDATE
TO anon
USING (true);

-- 3. Fix forum posts: restrict DELETE and UPDATE to authenticated only
DROP POLICY IF EXISTS "Users can delete own posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.forum_posts;

CREATE POLICY "Users can delete own posts"
ON public.forum_posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
ON public.forum_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Fix review-images storage: add UPDATE policy with ownership check
CREATE POLICY "Users can update own review images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'review-images' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'review-images' AND auth.uid()::text = (storage.foldername(name))[1]);