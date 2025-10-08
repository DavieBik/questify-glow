-- Fix infinite recursion in users table RLS policies
-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "users_require_auth_select" ON public.users;

-- Create a non-recursive policy for users table
-- Users can view their own profile
CREATE POLICY "users_can_view_own_profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins can view all users (using a function to avoid recursion)
CREATE POLICY "admins_can_view_all_users"
ON public.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
    AND om.role = 'admin'
  )
);

-- Add level enum to courses table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_level') THEN
    CREATE TYPE public.course_level AS ENUM ('Beginner', 'Intermediate', 'Advanced');
  END IF;
END $$;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS level public.course_level DEFAULT 'Beginner';

COMMENT ON COLUMN public.courses.level IS 'Course difficulty level (Beginner, Intermediate, Advanced)';