-- Fix get_default_org_id function to be STABLE (reads from table)
CREATE OR REPLACE FUNCTION public.get_default_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT default_org_id FROM public.app_settings WHERE id = 1 LIMIT 1;
$function$;

-- Add foreign key constraint to ensure default_org_id references valid organization
ALTER TABLE public.app_settings 
ADD CONSTRAINT app_settings_default_org_id_fkey 
FOREIGN KEY (default_org_id) 
REFERENCES public.organizations(id) 
ON DELETE RESTRICT;

-- Create trigger function to update updated_at column
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Add trigger to app_settings for updated_at
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Make the initial insert idempotent by recreating it with ON CONFLICT
DELETE FROM public.app_settings WHERE id = 1;
INSERT INTO public.app_settings (id, default_org_id) 
VALUES (1, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Verify and update key RLS policies to use get_default_org_id()
-- Update organization-related policies that might still use hardcoded checks

-- Update courses RLS policy to use get_default_org_id()
DROP POLICY IF EXISTS "courses_select_policy" ON public.courses;
CREATE POLICY "courses_select_policy"
ON public.courses
FOR SELECT
USING (
  is_active AND (
    (visibility_type = 'public'::text) OR 
    ((visibility_type = 'private'::text) AND (organization_id = get_default_org_id())) OR 
    ((visibility_type = 'licensed'::text) AND (organization_id IS NULL))
  )
);

-- Update org_* policies to use get_default_org_id()
DROP POLICY IF EXISTS "org_announcements_policy" ON public.announcements;
CREATE POLICY "org_announcements_policy"
ON public.announcements
FOR ALL
USING (
  (organization_id = get_default_org_id()) OR 
  (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])))
);

DROP POLICY IF EXISTS "org_forums_policy" ON public.forums;
CREATE POLICY "org_forums_policy"
ON public.forums
FOR ALL
USING (
  (organization_id = get_default_org_id()) OR 
  (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])))
);

DROP POLICY IF EXISTS "org_groups_policy" ON public.groups;
CREATE POLICY "org_groups_policy"
ON public.groups
FOR ALL
USING (
  (organization_id = get_default_org_id()) OR 
  (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])))
);

DROP POLICY IF EXISTS "org_projects_policy" ON public.projects;
CREATE POLICY "org_projects_policy"
ON public.projects
FOR ALL
USING (
  (organization_id = get_default_org_id()) OR 
  (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])))
);