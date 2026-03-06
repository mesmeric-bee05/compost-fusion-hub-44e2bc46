
-- Coupons table for promotions/discount codes
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  max_uses integer DEFAULT NULL,
  times_used integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT NULL
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can validate a coupon code (read active coupons)
CREATE POLICY "Anyone can view active coupons" ON public.coupons
  FOR SELECT TO authenticated USING (is_active = true);

-- Admins can manage coupons
CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add coupon_code to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

-- Storage bucket for review images
INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true)
ON CONFLICT DO NOTHING;

-- RLS for review-images bucket
CREATE POLICY "Anyone can view review images" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-images');

CREATE POLICY "Authenticated users can upload review images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'review-images');

CREATE POLICY "Users can delete own review images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'review-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add image_url to product_reviews
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;

-- Increment coupon usage function
CREATE OR REPLACE FUNCTION public.apply_coupon(
  _code text,
  _order_total numeric
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coupon record;
  _discount numeric;
BEGIN
  SELECT * INTO _coupon FROM coupons
  WHERE code = UPPER(TRIM(_code))
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR times_used < max_uses);

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or expired coupon code');
  END IF;

  IF _order_total < COALESCE(_coupon.min_order_amount, 0) THEN
    RETURN json_build_object('error', format('Minimum order amount is KES %s', _coupon.min_order_amount));
  END IF;

  IF _coupon.discount_type = 'percentage' THEN
    _discount := ROUND(_order_total * _coupon.discount_value / 100, 2);
  ELSE
    _discount := LEAST(_coupon.discount_value, _order_total);
  END IF;

  RETURN json_build_object(
    'discount', _discount,
    'coupon_id', _coupon.id,
    'description', _coupon.description,
    'discount_type', _coupon.discount_type,
    'discount_value', _coupon.discount_value
  );
END;
$$;

-- Function to increment coupon usage when order is created
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.coupon_code IS NOT NULL THEN
    UPDATE coupons SET times_used = times_used + 1 WHERE code = NEW.coupon_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_coupon_usage
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_coupon_usage();
