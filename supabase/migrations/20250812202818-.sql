-- Fix the users table RLS to allow user data fetching after org creation
-- The current policies are too restrictive and preventing user data access

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create working policies that allow proper user data access
CREATE POLICY "users_can_read_own_data" ON public.users
FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_can_insert_own_profile" ON public.users
FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "users_can_update_own_profile" ON public.users
FOR UPDATE USING (id = auth.uid());