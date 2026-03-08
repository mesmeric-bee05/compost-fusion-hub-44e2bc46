
-- Allow authenticated users to read basic profile info for leaderboard
CREATE POLICY "Authenticated can read names for leaderboard" ON public.profiles
  FOR SELECT TO authenticated USING (true);
