-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for certificates storage
CREATE POLICY "Users can view their own certificates"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'certificates' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all certificates"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'certificates' AND
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

CREATE POLICY "System can insert certificates"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'certificates');

CREATE POLICY "Admins can delete certificates"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'certificates' AND
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

-- Add pdf_url column to certificates table if not exists
ALTER TABLE public.certificates
ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;

COMMENT ON COLUMN public.certificates.pdf_storage_path IS 'Storage path to the generated PDF certificate file';