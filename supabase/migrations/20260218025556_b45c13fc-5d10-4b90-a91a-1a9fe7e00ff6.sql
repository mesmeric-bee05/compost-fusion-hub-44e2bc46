
-- Part 1A: Attach trigger to auth.users for handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Part 1C: Fix collection_requests RLS policies (change from RESTRICTIVE to PERMISSIVE)
DROP POLICY IF EXISTS "Users can view own collections" ON public.collection_requests;
DROP POLICY IF EXISTS "Users can create collections" ON public.collection_requests;
DROP POLICY IF EXISTS "Users can update own collections" ON public.collection_requests;
DROP POLICY IF EXISTS "Drivers can view assigned collections" ON public.collection_requests;
DROP POLICY IF EXISTS "Drivers can update assigned collections" ON public.collection_requests;
DROP POLICY IF EXISTS "Admins can manage collections" ON public.collection_requests;

CREATE POLICY "Users can view own collections" ON public.collection_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create collections" ON public.collection_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections" ON public.collection_requests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Drivers can view assigned collections" ON public.collection_requests
  FOR SELECT TO authenticated USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can update assigned collections" ON public.collection_requests
  FOR UPDATE TO authenticated USING (auth.uid() = driver_id);

CREATE POLICY "Admins can manage collections" ON public.collection_requests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Part 2: Create product-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

CREATE POLICY "Anyone can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images');
