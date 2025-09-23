-- Move the existing user to the same organization so you can message them
UPDATE users 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE id = '84b8a538-fe07-448a-95ca-e8334b5f8c75';