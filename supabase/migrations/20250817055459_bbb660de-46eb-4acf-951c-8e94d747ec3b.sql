-- Fix email confirmation for both email variants
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email IN ('info@rootsandorigin.com', 'info@rootsandorigin.com.au') 
AND email_confirmed_at IS NULL;

-- Check what email addresses exist
SELECT email, email_confirmed_at, confirmed_at 
FROM auth.users 
WHERE email LIKE '%rootsandorigin%';