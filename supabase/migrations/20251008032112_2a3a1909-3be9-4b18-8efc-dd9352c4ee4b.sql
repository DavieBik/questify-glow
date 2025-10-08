-- Add missing fields to courses table for detailed course information
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS compliance_standard TEXT,
ADD COLUMN IF NOT EXISTS training_type TEXT,
ADD COLUMN IF NOT EXISTS expiry_period_months INTEGER;

COMMENT ON COLUMN public.courses.compliance_standard IS 'Compliance standard the course adheres to (e.g., NDIS, ISO)';
COMMENT ON COLUMN public.courses.training_type IS 'Type of training (e.g., Online, Blended, Practical)';
COMMENT ON COLUMN public.courses.expiry_period_months IS 'Number of months before course certification expires';