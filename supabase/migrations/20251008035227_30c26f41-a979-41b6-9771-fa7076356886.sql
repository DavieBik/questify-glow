-- Update handle_new_user trigger to auto-enroll in "Getting Started with Skillbridge" course
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Auto-enroll in "Getting Started with Skillbridge" course
  INSERT INTO public.user_course_enrollments (user_id, course_id, status, enrollment_date)
  VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000001',
    'enrolled',
    NOW()
  )
  ON CONFLICT (user_id, course_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Failed to create profile or enroll user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;