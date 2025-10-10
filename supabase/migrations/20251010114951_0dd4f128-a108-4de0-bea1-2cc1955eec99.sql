-- Make password_hash nullable since auth is handled by auth.users
ALTER TABLE public.users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Also make first_name and last_name nullable as they should be optional
ALTER TABLE public.users 
ALTER COLUMN first_name DROP NOT NULL;

ALTER TABLE public.users 
ALTER COLUMN last_name DROP NOT NULL;

-- Now create the profile for the existing user
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
  '445fe81c-771f-4706-bcc4-f3d1bc2631e0'::uuid,
  'mtalha.aideveloper@gmail.com',
  'm',
  'talha',
  'worker',
  (SELECT id FROM organizations LIMIT 1),
  true
)
ON CONFLICT (id) DO NOTHING;