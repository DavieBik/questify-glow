-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false);

-- Create storage policies for videos
CREATE POLICY "Users can view videos they have access to" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'videos' AND EXISTS (
  SELECT 1 FROM public.user_course_enrollments uce
  JOIN public.modules m ON m.course_id = uce.course_id
  WHERE uce.user_id = auth.uid()
  AND (storage.foldername(name))[1] = m.id::text
));

CREATE POLICY "Admins can manage all videos" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'videos' AND EXISTS (
  SELECT 1 FROM public.users u 
  WHERE u.id = auth.uid() 
  AND u.role = 'admin'::user_role
));