
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
