-- Update existing user to worker role (equivalent to staff)
UPDATE public.users 
SET role = 'worker'
WHERE email = 'daviebik@gmail.com';

-- Insert admin user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'daviebiks@gmail.com',
  crypt('Steely123!!@', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Admin", "last_name": "User"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Insert manager user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'info@rootsandorigin.com',
  crypt('Steely123!!@', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Manager", "last_name": "User"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Insert corresponding users table records with proper roles
INSERT INTO public.users (
  id,
  email,
  first_name,
  last_name,
  role,
  organization_id,
  is_active,
  created_at,
  updated_at
) 
SELECT 
  au.id,
  'daviebiks@gmail.com',
  'Admin',
  'User',
  'admin'::user_role,
  get_default_org_id(),
  true,
  now(),
  now()
FROM auth.users au 
WHERE au.email = 'daviebiks@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin'::user_role,
  first_name = 'Admin',
  last_name = 'User';

INSERT INTO public.users (
  id,
  email,
  first_name,
  last_name,
  role,
  organization_id,
  is_active,
  created_at,
  updated_at
) 
SELECT 
  au.id,
  'info@rootsandorigin.com',
  'Manager',
  'User',
  'manager'::user_role,
  get_default_org_id(),
  true,
  now(),
  now()
FROM auth.users au 
WHERE au.email = 'info@rootsandorigin.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'manager'::user_role,
  first_name = 'Manager',
  last_name = 'User';