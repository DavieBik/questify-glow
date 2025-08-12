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
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_can_insert_own_profile" ON public.users
FOR INSERT WITH CHECK (id = auth.uid());