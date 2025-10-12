-- Drop ALL existing policies on users table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.users';
    END LOOP;
END $$;

-- Create new policies that don't cause recursion
-- Users can view their own profile (simple check, no recursion)
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own basic info (simple check, no recursion)
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can view all users (using has_role security definer function)
CREATE POLICY "users_select_admin"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::user_role)
  );

-- Admins can manage all users (using has_role security definer function)
CREATE POLICY "users_manage_admin"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::user_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::user_role)
  );

-- Allow insert for new user creation (during signup)
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);