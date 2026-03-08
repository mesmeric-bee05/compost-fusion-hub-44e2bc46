
-- Add a delete policy for content (admins only) since it's missing
CREATE POLICY "Admins can delete content" ON public.content
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Badge definitions table
CREATE TABLE public.badge_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'award',
  category text NOT NULL DEFAULT 'general',
  requirement_type text NOT NULL,
  requirement_value numeric NOT NULL DEFAULT 1,
  points_reward integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" ON public.badge_definitions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage badges" ON public.badge_definitions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- User badges (earned)
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges" ON public.user_badges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view badges for leaderboard" ON public.user_badges
  FOR SELECT USING (true);

-- Seed some default badge definitions
INSERT INTO public.badge_definitions (name, description, icon, category, requirement_type, requirement_value, points_reward) VALUES
  ('First Collection', 'Schedule your first waste collection', 'truck', 'collections', 'collections_count', 1, 10),
  ('Eco Warrior', 'Complete 10 waste collections', 'shield', 'collections', 'collections_count', 10, 50),
  ('Green Champion', 'Complete 25 waste collections', 'trophy', 'collections', 'collections_count', 25, 100),
  ('First Purchase', 'Make your first product purchase', 'shopping-bag', 'shopping', 'orders_count', 1, 10),
  ('Loyal Customer', 'Make 5 product purchases', 'heart', 'shopping', 'orders_count', 5, 50),
  ('Compost Starter', 'Divert 10 kg of waste', 'leaf', 'impact', 'waste_diverted_kg', 10, 15),
  ('Waste Reducer', 'Divert 100 kg of waste', 'recycle', 'impact', 'waste_diverted_kg', 100, 75),
  ('Carbon Saver', 'Save 50 kg of CO2', 'cloud', 'impact', 'co2_saved_kg', 50, 60),
  ('Community Voice', 'Post 5 forum discussions', 'message-circle', 'community', 'forum_posts_count', 5, 30),
  ('Reviewer', 'Write 3 product reviews', 'star', 'community', 'reviews_count', 3, 25);
