-- Update existing user to admin role
UPDATE public.users SET role = 'admin' WHERE email = 'daviebik@gmail.com';

-- Insert test users for different roles if they don't exist
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at,
  is_anonymous
) VALUES
-- Admin user
('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
 'admin@skillbridge.com', '$2a$10$5V5O5V5O5V5O5V5O5V5O5OBQL5H6L5H6L5H6L5H6L5H6L5H6L5H6L5H6', 
 now(), null, '', null, '', null, '', '', null, null, 
 '{"provider":"email","providers":["email"]}', '{"first_name":"Admin","last_name":"User"}', 
 false, now(), now(), null, null, '', '', null, '', 0, null, '', null, false, null, false),

-- Manager user  
('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
 'manager@skillbridge.com', '$2a$10$5V5O5V5O5V5O5V5O5V5O5OBQL5H6L5H6L5H6L5H6L5H6L5H6L5H6L5H6', 
 now(), null, '', null, '', null, '', '', null, null, 
 '{"provider":"email","providers":["email"]}', '{"first_name":"Manager","last_name":"User"}', 
 false, now(), now(), null, null, '', '', null, '', 0, null, '', null, false, null, false),

-- Staff user
('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
 'staff@skillbridge.com', '$2a$10$5V5O5V5O5V5O5V5O5V5O5OBQL5H6L5H6L5H6L5H6L5H6L5H6L5H6L5H6', 
 now(), null, '', null, '', null, '', '', null, null, 
 '{"provider":"email","providers":["email"]}', '{"first_name":"Staff","last_name":"User"}', 
 false, now(), now(), null, null, '', '', null, '', 0, null, '', null, false, null, false)

ON CONFLICT (email) DO NOTHING;

-- Create corresponding public.users records
INSERT INTO public.users (id, email, first_name, last_name, role, organization_id)
SELECT 
  au.id, 
  au.email,
  au.raw_user_meta_data->>'first_name',
  au.raw_user_meta_data->>'last_name',
  CASE 
    WHEN au.email = 'admin@skillbridge.com' THEN 'admin'::user_role
    WHEN au.email = 'manager@skillbridge.com' THEN 'manager'::user_role
    WHEN au.email = 'staff@skillbridge.com' THEN 'staff'::user_role
    ELSE 'staff'::user_role
  END,
  get_default_org_id()
FROM auth.users au
WHERE au.email IN ('admin@skillbridge.com', 'manager@skillbridge.com', 'staff@skillbridge.com')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role;