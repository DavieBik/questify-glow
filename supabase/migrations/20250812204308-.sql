-- Fix infinite recursion in users table RLS policies
-- The current policies are causing infinite loops

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "users_can_read_own_data" ON public.users;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.users;

-- Create simple, non-recursive policies for users table
CREATE POLICY "Enable users to view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable users to insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable users to update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);