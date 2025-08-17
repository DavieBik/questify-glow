-- Fix the email confirmation issue for info@rootsandorigin.com.au
-- First, let's check if the user exists in auth.users and update their email_confirmed_at
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW()
WHERE email = 'info@rootsandorigin.com.au';

-- Insert or update the user in the public.users table
INSERT INTO public.users (
  id, 
  email, 
  first_name, 
  last_name, 
  role,
  organization_id
)
SELECT 
  au.id,
  'info@rootsandorigin.com.au',
  'Dan',
  'Niks', 
  'manager',
  (SELECT id FROM organizations LIMIT 1)
FROM auth.users au
WHERE au.email = 'info@rootsandorigin.com.au'
ON CONFLICT (id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role;