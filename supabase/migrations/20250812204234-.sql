-- Fix organizations RLS to allow members to see their organizations
-- This will allow proper subdomain validation and organization access

-- Drop the restrictive policies
DROP POLICY IF EXISTS "organizations_allow_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_allow_update" ON public.organizations;

-- Create new policies that allow organization members to access their org data
CREATE POLICY "Members can view their organizations" ON public.organizations
FOR SELECT USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.org_members 
    WHERE organization_id = organizations.id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Org admins can update organizations" ON public.organizations
FOR UPDATE USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.org_members 
    WHERE organization_id = organizations.id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  )
);