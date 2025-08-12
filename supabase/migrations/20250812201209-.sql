-- Fix infinite recursion in users table RLS policies

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_profile_only" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS prevent_user_privilege_escalation ON public.users;
DROP FUNCTION IF EXISTS public.prevent_unauthorized_user_changes();

-- Create simpler, non-recursive policies for users table
CREATE POLICY "users_can_view_own_profile" ON public.users
FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_can_update_own_profile" ON public.users
FOR UPDATE USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND organization_id = OLD.organization_id AND role = OLD.role);

CREATE POLICY "users_can_insert_own_profile" ON public.users
FOR INSERT WITH CHECK (id = auth.uid());

-- Create a simpler trigger that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent non-admin users from changing organization_id
  IF OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins can change organization membership';
    END IF;
  END IF;
  
  -- Prevent non-admin users from changing their role
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_user_privilege_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_user_changes();