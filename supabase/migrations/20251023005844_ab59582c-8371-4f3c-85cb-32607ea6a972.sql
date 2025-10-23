-- Update "Getting Started with Skillbridge" course settings
UPDATE courses 
SET 
  category = 'LMS Training',
  expiry_period_months = 0,
  is_active = true
WHERE id = '00000000-0000-0000-0000-000000000001';