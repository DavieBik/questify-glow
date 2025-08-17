-- Insert missing user record for authenticated user with placeholder password
INSERT INTO public.users (
  id, 
  email, 
  first_name, 
  last_name, 
  department,
  organization_id,
  role,
  is_active,
  password_hash
) VALUES (
  'af9d9f16-2643-475e-b118-d96cea5b8cb0',
  'daviebik@gmail.com',
  'David',
  'Biks',
  'Sales',
  '00000000-0000-0000-0000-000000000001',
  'worker',
  true,
  'placeholder_hash'
) ON CONFLICT (id) DO NOTHING;