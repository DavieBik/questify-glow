-- Fix RLS policy violation for organizations table

-- Drop the restrictive policies that are preventing organization creation
DROP POLICY IF EXISTS "Org admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "org_create_restricted" ON public.organizations;
DROP POLICY IF EXISTS "org_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "org_update_policy" ON public.organizations;

-- Create simpler policies that allow organization creation
CREATE POLICY "organizations_allow_insert" ON public.organizations
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "organizations_allow_select" ON public.organizations
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "organizations_allow_update" ON public.organizations
FOR UPDATE USING (created_by = auth.uid());