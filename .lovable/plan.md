

# Comprehensive Project Enhancement Plan

## Overview
This plan covers three major feature additions plus a full-project quality pass: article comments, article bookmarks, and holistic improvements identified from the screenshots and codebase review.

## 1. Article Comments System

**Database:**
- New `article_comments` table: `id`, `content_id` (FK to content), `user_id`, `body` (text), `created_at`
- RLS: authenticated users can INSERT (own), SELECT (all published article comments), UPDATE/DELETE (own). Admins can manage all.

**Frontend:**
- New `src/components/education/ArticleComments.tsx` component
- Displays threaded comments with user name (from profiles), timestamps
- Comment form (textarea + submit) for logged-in users, "Sign in to comment" prompt for guests
- Integrated at bottom of article dialog in `Education.tsx`

## 2. Article Bookmarks (Save for Later)

**Database:**
- New `article_bookmarks` table: `id`, `content_id` (FK to content), `user_id`, `created_at`, unique constraint on (user_id, content_id)
- RLS: authenticated users can INSERT/DELETE/SELECT own bookmarks

**Frontend:**
- New `src/hooks/useBookmarks.ts` hook (similar pattern to `useWishlist`)
- Bookmark toggle button (bookmark icon) on article cards and inside article dialog
- New `/bookmarks` route with `src/pages/Bookmarks.tsx` showing saved articles
- Add Bookmarks link to user dropdown menu in Navbar

## 3. Full-Project Quality & Feature Pass

Based on the screenshots and codebase review:

**Product Images (from Screenshot 1):**
- The ProductHighlights on landing page uses emoji placeholders instead of actual product images from the database. Update `ProductHighlights.tsx` to fetch real products from the database and display actual images, matching the screenshot layout.

**Security Hardening:**
- Add `DialogDescription` to all Dialog components missing it (accessibility warning fix)
- Ensure `profiles` table has INSERT policy for new user creation via trigger (currently missing INSERT policy -- likely handled by a trigger, but verify)

**Minor UI Polish:**
- Add Bookmarks icon to navbar (next to wishlist heart)
- Education page: ensure empty state matches screenshot (already looks correct)
- Community page: matches screenshot (already correct)

## Database Migration (single SQL migration)

```sql
-- Article comments
CREATE TABLE public.article_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments on published content"
  ON public.article_comments FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.content WHERE content.id = article_comments.content_id AND content.is_published = true
  ));

CREATE POLICY "Authenticated users can create comments"
  ON public.article_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.article_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.article_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all comments"
  ON public.article_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Article bookmarks
CREATE TABLE public.article_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_id)
);

ALTER TABLE public.article_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks"
  ON public.article_bookmarks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks"
  ON public.article_bookmarks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete bookmarks"
  ON public.article_bookmarks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

## Files to Create
1. `src/components/education/ArticleComments.tsx` - Comments UI with list + form
2. `src/hooks/useBookmarks.ts` - Bookmark toggle hook
3. `src/pages/Bookmarks.tsx` - Saved articles page

## Files to Edit
1. `src/pages/Education.tsx` - Add bookmark toggle + comments component to article dialog
2. `src/components/landing/Navbar.tsx` - Add Bookmarks icon link
3. `src/App.tsx` - Add `/bookmarks` route
4. `src/components/landing/ProductHighlights.tsx` - Fetch real products from DB instead of hardcoded data

## Implementation Order
1. Run database migration (comments + bookmarks tables)
2. Create `useBookmarks` hook
3. Create `ArticleComments` component
4. Create `Bookmarks` page
5. Update `Education.tsx` with bookmarks + comments
6. Update `Navbar`, `App.tsx` with bookmarks route
7. Update `ProductHighlights` to use real DB products

