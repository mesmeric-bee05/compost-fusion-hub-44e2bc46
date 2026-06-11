
-- 1. Profiles: drop overly broad read policy
DROP POLICY IF EXISTS "Authenticated can read names for leaderboard" ON public.profiles;

-- Replace with restricted RPC for public profile names/avatars
CREATE OR REPLACE FUNCTION public.get_public_profiles(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
  LIMIT 500;
$$;
REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated, service_role;

-- 2. Coupons: drop broad authenticated read; use apply_coupon RPC instead
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

-- 3. Review images bucket: enforce per-user folder on upload
DROP POLICY IF EXISTS "Authenticated users can upload review images" ON storage.objects;
CREATE POLICY "Authenticated users can upload review images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'review-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 4. Payments: per-transaction callback token
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS callback_token text;
CREATE INDEX IF NOT EXISTS idx_payments_callback_token ON public.payments(callback_token);

-- 5. Orders: remove direct INSERT policy on orders and order_items; route through RPC
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;

-- 6. create_order RPC: computes authoritative total, validates coupon, inserts atomically
CREATE OR REPLACE FUNCTION public.create_order(
  _items jsonb,
  _delivery_address text,
  _delivery_phone text,
  _notes text DEFAULT NULL,
  _coupon_code text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _order_id uuid;
  _subtotal numeric := 0;
  _discount numeric := 0;
  _final numeric;
  _it jsonb;
  _pid uuid;
  _qty int;
  _price numeric;
  _coupon json;
  _norm_coupon text := NULL;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'no_items';
  END IF;
  IF jsonb_array_length(_items) > 50 THEN RAISE EXCEPTION 'too_many_items'; END IF;
  IF length(coalesce(trim(_delivery_address), '')) = 0 THEN RAISE EXCEPTION 'address_required'; END IF;
  IF length(coalesce(trim(_delivery_phone), '')) = 0 THEN RAISE EXCEPTION 'phone_required'; END IF;
  IF length(_delivery_address) > 500 THEN RAISE EXCEPTION 'address_too_long'; END IF;
  IF length(coalesce(_notes, '')) > 1000 THEN RAISE EXCEPTION 'notes_too_long'; END IF;

  -- Compute subtotal using current DB prices
  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _pid := (_it->>'product_id')::uuid;
    _qty := COALESCE((_it->>'quantity')::int, 0);
    IF _qty <= 0 OR _qty > 1000 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
    SELECT price INTO _price FROM products WHERE id = _pid;
    IF _price IS NULL THEN RAISE EXCEPTION 'invalid_product'; END IF;
    _subtotal := _subtotal + (_price * _qty);
  END LOOP;

  IF _coupon_code IS NOT NULL AND length(trim(_coupon_code)) > 0 THEN
    _norm_coupon := upper(trim(_coupon_code));
    _coupon := public.apply_coupon(_norm_coupon, _subtotal);
    IF (_coupon->>'error') IS NOT NULL THEN
      RAISE EXCEPTION 'coupon_error: %', _coupon->>'error';
    END IF;
    _discount := COALESCE((_coupon->>'discount')::numeric, 0);
  END IF;

  _final := GREATEST(_subtotal - _discount, 0);

  INSERT INTO public.orders (user_id, total_amount, delivery_address, delivery_phone, notes, coupon_code, discount_amount)
  VALUES (_uid, _final, _delivery_address, _delivery_phone, NULLIF(trim(coalesce(_notes,'')),''), _norm_coupon, _discount)
  RETURNING id INTO _order_id;

  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _pid := (_it->>'product_id')::uuid;
    _qty := (_it->>'quantity')::int;
    SELECT price INTO _price FROM products WHERE id = _pid;
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price)
    VALUES (_order_id, _pid, _qty, _price, _price * _qty);
  END LOOP;

  RETURN json_build_object(
    'order_id', _order_id,
    'total_amount', _final,
    'discount_amount', _discount,
    'subtotal', _subtotal
  );
END;
$$;
REVOKE ALL ON FUNCTION public.create_order(jsonb, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb, text, text, text, text) TO authenticated;

-- 7. Lock down SECURITY DEFINER admin/internal functions from anonymous access
REVOKE EXECUTE ON FUNCTION public.search_audit_log(text, timestamptz, timestamptz, text, text[], text, int, int) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_audit_admin_names(uuid[]) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ussd_session_detail(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_ussd_sessions(text, text, boolean, int, int) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text[], jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_email_resend_rate(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_profiles(uuid[]) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_coupon(text, numeric) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.search_audit_log(text, timestamptz, timestamptz, text, text[], text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_admin_names(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ussd_session_detail(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_ussd_sessions(text, text, boolean, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text[], jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_email_resend_rate(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_profiles(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_coupon(text, numeric) TO authenticated;
