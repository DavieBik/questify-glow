-- Fix security definer functions by setting proper search_path
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID 
LANGUAGE SQL 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(required_role TEXT)
RETURNS BOOLEAN 
LANGUAGE SQL 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    JOIN public.users u ON u.id = om.user_id
    WHERE om.user_id = auth.uid() 
    AND u.organization_id = om.organization_id
    AND om.role = required_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin_or_manager()
RETURNS BOOLEAN 
LANGUAGE SQL 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members om
    JOIN public.users u ON u.id = om.user_id
    WHERE om.user_id = auth.uid() 
    AND u.organization_id = om.organization_id
    AND om.role IN ('admin', 'manager')
  );
$$;