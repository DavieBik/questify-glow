-- Single-tenant migration: Set up organization defaults and triggers
-- This migration prepares the database for single-tenant operation

-- First, ensure we have the default organization (if it doesn't exist)
DO $$
DECLARE
  default_org_id UUID := '00000000-0000-0000-0000-000000000001';
  existing_org_count INTEGER;
BEGIN
  -- Check if organization already exists
  SELECT COUNT(*) INTO existing_org_count FROM public.organizations WHERE id = default_org_id;
  
  IF existing_org_count = 0 THEN
    -- Insert the default organization
    INSERT INTO public.organizations (
      id,
      name,
      slug,
      contact_email,
      subscription_plan,
      max_users,
      is_active,
      primary_color,
      created_by
    ) VALUES (
      default_org_id,
      'SkillBridge Learning',
      'skillbridge',
      'admin@skillbridge.com.au',
      'enterprise',
      999,
      true,
      '#059669',
      default_org_id -- Self-reference for system org
    );
  END IF;
END $$;

-- Create function to get the default organization ID
CREATE OR REPLACE FUNCTION public.get_default_org_id()
RETURNS UUID
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT '00000000-0000-0000-0000-000000000001'::UUID;
$$;

-- Update existing function to use default org for single-tenant
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT get_default_org_id();
$$;

-- Create trigger function to auto-assign organization_id on user insert
CREATE OR REPLACE FUNCTION public.auto_assign_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Always assign the default organization ID
  NEW.organization_id := get_default_org_id();
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign organization on user creation
DROP TRIGGER IF EXISTS trigger_auto_assign_organization ON public.users;
CREATE TRIGGER trigger_auto_assign_organization
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_organization();

-- Update existing users to have the default organization (if they don't have one)
UPDATE public.users 
SET organization_id = get_default_org_id() 
WHERE organization_id IS NULL;

-- Auto-assign organization to other tables that need it
CREATE OR REPLACE FUNCTION public.auto_assign_organization_generic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-assign organization_id if it's NULL and the column exists
  IF TG_TABLE_NAME IN ('courses', 'modules', 'announcements', 'forums', 'groups', 'projects', 'sessions', 'departments', 'content_imports', 'bulk_jobs') THEN
    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := get_default_org_id();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Add triggers for tables that should auto-assign organization_id
DO $$
DECLARE
  table_name TEXT;
  tables_with_org_id TEXT[] := ARRAY['courses', 'modules', 'announcements', 'forums', 'groups', 'projects', 'sessions', 'departments', 'content_imports', 'bulk_jobs'];
BEGIN
  FOREACH table_name IN ARRAY tables_with_org_id
  LOOP
    -- Drop existing trigger if it exists
    EXECUTE format('DROP TRIGGER IF EXISTS trigger_auto_assign_org_%s ON public.%I', table_name, table_name);
    
    -- Create new trigger
    EXECUTE format('
      CREATE TRIGGER trigger_auto_assign_org_%s
        BEFORE INSERT ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.auto_assign_organization_generic()
    ', table_name, table_name);
  END LOOP;
END $$;

-- Update existing records to have the default organization
UPDATE public.courses SET organization_id = get_default_org_id() WHERE organization_id IS NULL;
UPDATE public.modules SET organization_id = get_default_org_id() WHERE organization_id IS NULL;
UPDATE public.announcements SET organization_id = get_default_org_id() WHERE organization_id IS NULL;
UPDATE public.forums SET organization_id = get_default_org_id() WHERE organization_id IS NULL;
UPDATE public.groups SET organization_id = get_default_org_id() WHERE organization_id IS NULL;
UPDATE public.projects SET organization_id = get_default_org_id() WHERE organization_id IS NULL;
UPDATE public.sessions SET organization_id = get_default_org_id() WHERE organization_id IS NULL;
UPDATE public.departments SET organization_id = get_default_org_id() WHERE organization_id IS NULL;

-- Ensure all users are members of the default organization
INSERT INTO public.org_members (organization_id, user_id, role)
SELECT 
  get_default_org_id(),
  u.id,
  CASE 
    WHEN u.role = 'admin' THEN 'admin'
    WHEN u.role = 'manager' THEN 'manager'
    ELSE 'worker'
  END
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.org_members om 
  WHERE om.user_id = u.id AND om.organization_id = get_default_org_id()
)
ON CONFLICT (organization_id, user_id) DO NOTHING;