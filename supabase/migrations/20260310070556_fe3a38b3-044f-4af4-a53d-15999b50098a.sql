
-- Create storage bucket for content images
INSERT INTO storage.buckets (id, name, public) VALUES ('content-images', 'content-images', true);

-- Allow admins to upload content images
CREATE POLICY "Admins can upload content images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to update content images
CREATE POLICY "Admins can update content images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'content-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to delete content images
CREATE POLICY "Admins can delete content images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow anyone to view content images
CREATE POLICY "Anyone can view content images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'content-images');
