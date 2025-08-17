-- Fix the email confirmation for info@rootsandorigin.com.au
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'info@rootsandorigin.com.au' AND email_confirmed_at IS NULL;

-- Update the user record in public.users for the existing user
UPDATE public.users 
SET 
  email = 'info@rootsandorigin.com.au',
  first_name = 'Dan',
  last_name = 'Niks',
  role = 'manager'
WHERE id = (SELECT id FROM auth.users WHERE email = 'info@rootsandorigin.com.au');