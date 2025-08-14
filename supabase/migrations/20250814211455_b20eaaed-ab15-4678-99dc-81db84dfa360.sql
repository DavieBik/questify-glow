-- Create app_settings table for centralized configuration
CREATE TABLE public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  default_org_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT single_row_check CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Insert the default organization ID
INSERT INTO public.app_settings (default_org_id) 
VALUES ('00000000-0000-0000-0000-000000000001');

-- Create function to get default org ID
CREATE OR REPLACE FUNCTION public.get_default_org_id()
RETURNS UUID
LANGUAGE SQL
IMMUTABLE
AS $function$
  SELECT default_org_id FROM public.app_settings WHERE id = 1 LIMIT 1;
$function$;

-- Update the existing get_user_org_id function to use app_settings
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT get_default_org_id();
$function$;

-- Create policy for app_settings (read-only for all authenticated users)
CREATE POLICY "Anyone can read app settings" 
ON public.app_settings 
FOR SELECT 
USING (true);

-- Only admins can update app settings
CREATE POLICY "Admins can update app settings" 
ON public.app_settings 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE id = auth.uid() AND role = 'admin'
));

-- Update auto_assign_organization function to use get_default_org_id
CREATE OR REPLACE FUNCTION public.auto_assign_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Always assign the default organization ID
  NEW.organization_id := get_default_org_id();
  RETURN NEW;
END;
$function$;

-- Update auto_assign_organization_generic function
CREATE OR REPLACE FUNCTION public.auto_assign_organization_generic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-assign organization_id if it's NULL and the column exists
  IF TG_TABLE_NAME IN ('courses', 'modules', 'announcements', 'forums', 'groups', 'projects', 'sessions', 'departments', 'content_imports', 'bulk_jobs') THEN
    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := get_default_org_id();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;