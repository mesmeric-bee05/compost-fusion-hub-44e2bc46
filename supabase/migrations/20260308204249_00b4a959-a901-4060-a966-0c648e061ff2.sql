
-- notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'order_update',
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger: order status change
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.user_id, 'order_update',
      'Order ' || INITCAP(NEW.status::text),
      'Your order has been updated to ' || NEW.status::text || '.',
      '/orders/' || NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_order_status_notify
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();

-- Trigger: collection status change
CREATE OR REPLACE FUNCTION public.notify_collection_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.user_id, 'collection_reminder',
      'Collection ' || INITCAP(NEW.status::text),
      'Your ' || NEW.waste_type::text || ' collection has been updated to ' || NEW.status::text || '.',
      '/collections');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_collection_status_notify
  AFTER UPDATE ON public.collection_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_collection_status_change();

-- Trigger: reward changes
CREATE OR REPLACE FUNCTION public.notify_reward_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.level IS DISTINCT FROM NEW.level THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.user_id, 'reward_achievement',
      'Level Up: ' || INITCAP(NEW.level),
      'Congratulations! You have reached ' || NEW.level || ' level.',
      '/dashboard');
  END IF;
  IF NEW.points > OLD.points AND (NEW.points / 100) > (OLD.points / 100) THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.user_id, 'reward_achievement',
      'Milestone: ' || (NEW.points / 100 * 100) || ' Points!',
      'You have earned ' || NEW.points || ' reward points. Keep it up!',
      '/dashboard');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_reward_change_notify
  AFTER UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.notify_reward_change();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
