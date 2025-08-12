-- Fix the users table infinite recursion issue
-- Drop ALL policies first to ensure clean state
DROP POLICY IF EXISTS "Enable users to view own profile" ON public.users;
DROP POLICY IF EXISTS "Enable users to insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable users to update own profile" ON public.users;
DROP POLICY IF EXISTS "users_can_read_own_data" ON public.users;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.users;

-- Create simple, working policies
CREATE POLICY "users_select_policy" 
ON public.users FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "users_insert_policy" 
ON public.users FOR INSERT 
WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_policy" 
ON public.users FOR UPDATE 
USING (id = auth.uid());