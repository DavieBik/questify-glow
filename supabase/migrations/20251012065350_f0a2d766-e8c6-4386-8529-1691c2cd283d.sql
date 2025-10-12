-- Fix security definer functions missing search_path (CRITICAL SECURITY FIX)
-- This prevents search path poisoning attacks on privileged functions

-- Fix has_org_role function
CREATE OR REPLACE FUNCTION public.has_org_role(required_role text)
RETURNS boolean
LANGUAGE sql
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

-- Fix is_conversation_participant function
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  );
$$;

-- Fix get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Fix get_current_user_org function
CREATE OR REPLACE FUNCTION public.get_current_user_org()
RETURNS uuid
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

-- Fix is_member_of function
CREATE OR REPLACE FUNCTION public.is_member_of(p_org uuid, p_user uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE organization_id = p_org AND user_id = COALESCE(p_user, auth.uid())
  );
$$;

-- Fix has_org_role (overloaded version) function
CREATE OR REPLACE FUNCTION public.has_org_role(p_org uuid, p_roles text[], p_user uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE organization_id = p_org
      AND user_id = COALESCE(p_user, auth.uid())
      AND role = ANY(p_roles)
  );
$$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = uid AND role = 'admin'::user_role
  );
$$;

-- Fix is_manager_of function
CREATE OR REPLACE FUNCTION public.is_manager_of(manager_uid uuid, employee_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE chain AS (
    SELECT id, manager_id FROM public.users WHERE id = employee_uid
    UNION ALL
    SELECT u.id, u.manager_id FROM public.users u JOIN chain ON u.id = chain.manager_id
  )
  SELECT EXISTS (SELECT 1 FROM chain WHERE id = manager_uid);
$$;

-- Fix is_org_admin_or_manager function
CREATE OR REPLACE FUNCTION public.is_org_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.org_members om
    JOIN public.users u ON u.id = om.user_id
    WHERE om.user_id = auth.uid()
      AND u.organization_id = om.organization_id
      AND om.role IN ('admin','manager')
  );
$$;

-- Fix get_user_org_id function
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_default_org_id();
$$;

-- Move extensions from public schema to extensions schema for better security
CREATE SCHEMA IF NOT EXISTS extensions;

-- Note: Moving ltree extension requires manual intervention as it may have dependencies
-- This is logged for admin awareness but not executed automatically
-- To manually move: 
-- 1. DROP EXTENSION ltree CASCADE;
-- 2. CREATE EXTENSION ltree SCHEMA extensions;
-- 3. Update any references to use extensions.ltree