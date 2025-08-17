-- Add pending_approval status to enrollment status check constraint if not already present
DO $$
BEGIN
  -- Check if the constraint exists and needs updating
  IF EXISTS (
    SELECT 1 
    FROM information_schema.constraint_column_usage 
    WHERE table_name = 'user_course_enrollments' 
    AND constraint_name LIKE '%status%'
  ) THEN
    -- Drop existing constraint if it exists
    ALTER TABLE public.user_course_enrollments 
    DROP CONSTRAINT IF EXISTS user_course_enrollments_status_check;
  END IF;
  
  -- Add updated constraint with pending_approval status
  ALTER TABLE public.user_course_enrollments 
  ADD CONSTRAINT user_course_enrollments_status_check 
  CHECK (status IN ('enrolled', 'completed', 'dropped', 'pending_approval', 'denied'));
END $$;