-- Add price and requires_approval fields to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- Update courses to set approval requirements
-- Mandatory courses and free courses can be self-enrolled
UPDATE public.courses 
SET requires_approval = NOT (is_mandatory OR price = 0.00);

-- Add comment for clarity
COMMENT ON COLUMN public.courses.price IS 'Course price in dollars. 0.00 means free.';
COMMENT ON COLUMN public.courses.requires_approval IS 'Whether this course requires manager approval before enrollment.';