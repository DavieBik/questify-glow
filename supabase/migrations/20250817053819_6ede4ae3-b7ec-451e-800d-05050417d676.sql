-- Update existing user to worker role (equivalent to staff)
UPDATE public.users 
SET role = 'worker'
WHERE email = 'daviebik@gmail.com';