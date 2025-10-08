-- Add favicon_url and secondary_color to org_branding table
ALTER TABLE public.org_branding 
ADD COLUMN IF NOT EXISTS favicon_url text,
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#10b981';

-- Create storage bucket for branding assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for branding bucket
CREATE POLICY "Everyone can view branding assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Admins can upload branding assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'branding'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update branding assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'branding'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete branding assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'branding'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);