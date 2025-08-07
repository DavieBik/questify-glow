-- Fix the search path security issue
CREATE OR REPLACE FUNCTION public.auto_enroll_unlocked_courses()
RETURNS TRIGGER AS $$
DECLARE
  unlocked_course_id UUID;
BEGIN
  -- Find courses that are now unlocked for this user
  FOR unlocked_course_id IN 
    SELECT DISTINCT cp.course_id
    FROM public.course_prerequisites cp
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_course_enrollments uce
      WHERE uce.course_id = cp.course_id AND uce.user_id = NEW.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.course_prerequisites cp2
      WHERE cp2.course_id = cp.course_id
      AND NOT EXISTS (
        SELECT 1 FROM public.completions c
        WHERE c.course_id = cp2.prerequisite_course_id 
        AND c.user_id = NEW.user_id 
        AND c.status = 'completed'
      )
    )
  LOOP
    -- Auto-enroll the user in the unlocked course
    INSERT INTO public.user_course_enrollments (user_id, course_id, status)
    VALUES (NEW.user_id, unlocked_course_id, 'enrolled')
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END LOOP;

  -- Award points for completion (10 points)
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.completions 
    SET points = 10 
    WHERE id = NEW.id AND points IS NULL;
    
    -- Update learning streak
    UPDATE public.users 
    SET last_completion_date = CURRENT_DATE
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';