-- Add driver_id to orders for delivery assignment
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_id uuid DEFAULT NULL;

-- Allow drivers to view orders assigned to them
CREATE POLICY "Drivers can view assigned orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

-- Allow drivers to update orders assigned to them (only delivery status)
CREATE POLICY "Drivers can update assigned orders"
ON public.orders FOR UPDATE
TO authenticated
USING (auth.uid() = driver_id);

-- Allow drivers to view order items for assigned orders
CREATE POLICY "Drivers can view assigned order items"
ON public.order_items FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.driver_id = auth.uid()
));

-- Create stock decrement function (called when order status changes to confirmed)
CREATE OR REPLACE FUNCTION public.decrement_stock_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    UPDATE products
    SET stock_quantity = GREATEST(stock_quantity - oi.quantity, 0)
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND products.id = oi.product_id;
  END IF;
  
  -- Restore stock if order is cancelled from confirmed/shipped
  IF NEW.status = 'cancelled' AND OLD.status IN ('confirmed', 'shipped') THEN
    UPDATE products
    SET stock_quantity = stock_quantity + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND products.id = oi.product_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for stock management
DROP TRIGGER IF EXISTS trg_decrement_stock ON public.orders;
CREATE TRIGGER trg_decrement_stock
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_stock_on_confirm();