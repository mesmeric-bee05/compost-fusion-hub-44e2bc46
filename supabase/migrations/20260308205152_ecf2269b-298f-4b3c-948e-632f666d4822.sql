
-- Order status history table for timeline
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "Admins can manage order history" ON public.order_status_history
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers can view assigned order history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.driver_id = auth.uid()));

-- Trigger to auto-record status changes
CREATE OR REPLACE FUNCTION public.record_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, status, note)
    VALUES (NEW.id, NEW.status::text, 'Status changed to ' || NEW.status::text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_record_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.record_order_status_change();

-- Also record initial status on insert
CREATE OR REPLACE FUNCTION public.record_order_initial_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.order_status_history (order_id, status, note)
  VALUES (NEW.id, NEW.status::text, 'Order placed');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_record_order_initial_status
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.record_order_initial_status();
