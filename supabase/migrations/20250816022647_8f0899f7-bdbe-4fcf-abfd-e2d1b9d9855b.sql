-- Create org_branding table
CREATE TABLE public.org_branding (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL DEFAULT get_default_org_id(),
  logo_url text,
  primary_color text DEFAULT '#059669',
  banner_image_url text,
  external_link_title text,
  external_link_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_org_branding UNIQUE (organization_id)
);

-- Enable RLS
ALTER TABLE public.org_branding ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view org branding"
ON public.org_branding
FOR SELECT
USING (true);

CREATE POLICY "Only admins can update org branding"
ON public.org_branding
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
    AND u.organization_id = org_branding.organization_id
  )
);

CREATE POLICY "Only admins can insert org branding"
ON public.org_branding
FOR INSERT
WITH CHECK (
  organization_id = get_default_org_id()
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
    AND u.organization_id = get_default_org_id()
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_org_branding_updated_at
  BEFORE UPDATE ON public.org_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Insert default branding for the default organization
INSERT INTO public.org_branding (organization_id, primary_color)
VALUES (get_default_org_id(), '#059669')
ON CONFLICT (organization_id) DO NOTHING;