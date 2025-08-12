-- Fix infinite recursion in org_members table policies

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Org admins can manage members" ON public.org_members;
DROP POLICY IF EXISTS "Users can view members of their organization" ON public.org_members;
DROP POLICY IF EXISTS "org_members_delete" ON public.org_members;
DROP POLICY IF EXISTS "org_members_insert_self" ON public.org_members;
DROP POLICY IF EXISTS "org_members_select" ON public.org_members;
DROP POLICY IF EXISTS "org_members_update" ON public.org_members;
DROP POLICY IF EXISTS "org_members_write" ON public.org_members;

-- Create simpler, non-recursive policies for org_members
CREATE POLICY "org_members_allow_insert" ON public.org_members
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "org_members_allow_select" ON public.org_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "org_members_allow_update" ON public.org_members
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "org_members_allow_delete" ON public.org_members
FOR DELETE USING (user_id = auth.uid());