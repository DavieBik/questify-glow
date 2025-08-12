-- Force drop ALL possible policies on users table to fix infinite recursion
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "Enable users to view own profile" ON public.users;
DROP POLICY IF EXISTS "Enable users to insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable users to update own profile" ON public.users;
DROP POLICY IF EXISTS "users_can_read_own_data" ON public.users;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.users;

-- Create clean, simple policies with unique names
CREATE POLICY "users_read_own" 
ON public.users FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "users_insert_own" 
ON public.users FOR INSERT 
WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own" 
ON public.users FOR UPDATE 
USING (id = auth.uid());