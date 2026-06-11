
-- A. Drop driver SELECT on payments — drivers don't need callback_token
DROP POLICY IF EXISTS "Drivers can view assigned order payments" ON public.payments;

-- B. Restrict coupons SELECT to admins only
DROP POLICY IF EXISTS "Public read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Anyone can read coupons" ON public.coupons;

CREATE POLICY "Admins can view coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- C. product-images UPDATE/DELETE for admins
CREATE POLICY "Admins update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role));
