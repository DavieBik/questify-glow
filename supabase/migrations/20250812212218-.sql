-- Create user record and link to most recent organization
INSERT INTO users (id, organization_id, role, first_name, last_name, email, is_active, created_at, updated_at, password_hash)
VALUES (
  '84b8a538-fe07-448a-95ca-e8334b5f8c75',
  '53d41f93-7b98-4780-9185-b97e896eff1f', -- roots-2026 org id
  'admin',
  'David',
  'Bik',
  'daviebiks@gmail.com',
  true,
  now(),
  now(),
  'placeholder_hash' -- This won't be used since auth is handled by Supabase Auth
)
ON CONFLICT (id) DO UPDATE SET
  organization_id = '53d41f93-7b98-4780-9185-b97e896eff1f',
  updated_at = now();