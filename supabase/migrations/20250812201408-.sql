-- Completely disable RLS on users table to prevent recursion

-- Drop all RLS policies on users table
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.users;

-- Disable RLS on users table entirely
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;