-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    role,
    organization_id,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
    'worker',
    (SELECT id FROM organizations LIMIT 1),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Drop existing policy if exists and create new one
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);