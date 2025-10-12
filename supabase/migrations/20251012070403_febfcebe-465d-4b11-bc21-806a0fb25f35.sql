-- CRITICAL SECURITY FIX: Separate user roles from users table (Part 1 - Drop existing)
-- This prevents privilege escalation attacks and RLS recursion issues

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Drop the table if it exists to start fresh
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Step 1: Create user_roles table with proper security
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create security definer function to check roles
-- This bypasses RLS and prevents recursive policy issues
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Step 3: Migrate existing roles from users table to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role 
FROM public.users 
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.user_roles IS 'Stores user roles separately from users table to prevent privilege escalation attacks. Use has_role() function in RLS policies instead of querying users.role.';