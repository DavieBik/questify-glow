-- Create RLS policy to allow users to enroll themselves in courses
CREATE POLICY "Users can enroll themselves in courses" 
ON public.user_course_enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Also ensure users can insert their own enrollments for SELECT operations  
-- (the existing SELECT policy should cover this, but let's verify it works)