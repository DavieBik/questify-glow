-- Create a security definer function to get user role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Create another helper to check if user is in specific org
CREATE OR REPLACE FUNCTION public.get_current_user_org()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS admins_managers_view_org_users ON public.users;

-- Recreate it using the security definer function to avoid recursion
CREATE POLICY admins_managers_view_org_users 
ON public.users 
FOR SELECT 
TO public
USING (
  (auth.uid() IS NOT NULL) 
  AND (
    get_current_user_role() = ANY(ARRAY['admin'::user_role, 'manager'::user_role])
  )
  AND (
    organization_id = get_current_user_org()
  )
);

-- Also fix the delete policy which has the same issue
DROP POLICY IF EXISTS users_delete_policy ON public.users;

CREATE POLICY users_delete_policy 
ON public.users 
FOR DELETE 
TO public
USING (
  get_current_user_role() = 'admin'::user_role
);