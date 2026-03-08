

# Plan: Notification Center, Product Comparison & Wishlist Testing

## 1. Notification Center in Navbar

**Database**: Create a `notifications` table with columns: `id`, `user_id`, `type` (enum: `order_update`, `collection_reminder`, `reward_achievement`), `title`, `message`, `is_read`, `link`, `created_at`. Enable RLS so users see only their own. Enable Realtime for live updates.

**Backend triggers**: Create a database function + triggers that auto-insert notifications when:
- `orders.status` changes → notification to the order owner
- `collection_requests.status` changes → notification to the user
- `rewards.points` or `rewards.level` changes → achievement notification

**Frontend**:
- Create `src/hooks/useNotifications.ts` — fetches unread count + recent notifications via react-query, subscribes to Realtime for instant updates, exposes `markAsRead` and `markAllAsRead` mutations
- Create `src/components/notifications/NotificationCenter.tsx` — a Popover triggered by a Bell icon in the Navbar, showing a scrollable list of notifications with unread badge, timestamps, and click-to-navigate
- Update `Navbar.tsx` to add the Bell icon with unread count badge next to the cart/wishlist icons (authenticated users only)

## 2. Product Comparison Feature

**Frontend only** (no DB changes):
- Create `src/hooks/useCompare.ts` — a zustand-like state (or simple context/localStorage) holding up to 3 product IDs for comparison
- Update `ProductCard.tsx` — add a small "Compare" toggle button (e.g. `GitCompare` icon) that adds/removes from comparison set
- Create `src/pages/Compare.tsx` — a side-by-side comparison table showing name, image, price, category, stock, and all `specifications` keys merged across selected products. Show empty state when no products selected.
- Add `/compare` route to `App.tsx`
- Add a floating comparison bar at the bottom of the Products page showing selected items count with a "Compare Now" button linking to `/compare`

## 3. Wishlist Testing

After implementing the above features, use the browser automation tools to:
- Navigate to `/products`, click a heart icon on a product card
- Navigate to `/wishlist`, verify the product appears
- Click "Add to Cart", verify it moves to cart

## Technical Details

**Migration SQL** (single migration):
```sql
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

-- Trigger function for order status notifications
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.user_id, 'order_update',
      'Order ' || UPPER(NEW.status::text),
      'Your order has been updated to ' || NEW.status::text,
      '/orders/' || NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_order_status_notify
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();

-- Similar triggers for collection_requests and rewards
-- (collection status change, rewards level/points change)

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

**Files to create**: `src/hooks/useNotifications.ts`, `src/components/notifications/NotificationCenter.tsx`, `src/hooks/useCompare.ts`, `src/pages/Compare.tsx`

**Files to edit**: `src/components/landing/Navbar.tsx` (add bell icon + NotificationCenter), `src/components/products/ProductCard.tsx` (add compare toggle), `src/pages/Products.tsx` (add floating compare bar), `src/App.tsx` (add `/compare` route)

