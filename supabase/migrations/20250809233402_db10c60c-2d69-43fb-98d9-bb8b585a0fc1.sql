-- Create announcement system

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create announcement reads tracking table
CREATE TABLE public.announcement_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Users can view announcements for enrolled courses"
ON public.announcements
FOR SELECT
USING (
  -- Global announcements (no course_id) visible to all authenticated users
  course_id IS NULL OR
  -- Course-specific announcements visible to enrolled users
  EXISTS (
    SELECT 1 FROM public.user_course_enrollments uce
    WHERE uce.course_id = announcements.course_id 
    AND uce.user_id = auth.uid()
  ) OR
  -- Admins and managers can see all announcements
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can create announcements"
ON public.announcements
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Creators can update their announcements"
ON public.announcements
FOR UPDATE
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

CREATE POLICY "Admins can delete announcements"
ON public.announcements
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- RLS Policies for announcement_reads
CREATE POLICY "Users can view their own read status"
ON public.announcement_reads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark announcements as read"
ON public.announcement_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their read status"
ON public.announcement_reads
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_announcements_course_id ON public.announcements(course_id);
CREATE INDEX idx_announcements_created_by ON public.announcements(created_by);
CREATE INDEX idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX idx_announcements_priority ON public.announcements(priority);
CREATE INDEX idx_announcements_is_pinned ON public.announcements(is_pinned);
CREATE INDEX idx_announcement_reads_announcement_id ON public.announcement_reads(announcement_id);
CREATE INDEX idx_announcement_reads_user_id ON public.announcement_reads(user_id);

-- Create function to get announcement stats
CREATE OR REPLACE FUNCTION public.get_announcement_stats(announcement_id_param UUID)
RETURNS TABLE(
  total_readers BIGINT,
  total_eligible BIGINT,
  read_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  course_id_var UUID;
BEGIN
  -- Get the course_id for the announcement
  SELECT course_id INTO course_id_var
  FROM public.announcements
  WHERE id = announcement_id_param;

  -- Count readers
  SELECT COUNT(*) INTO total_readers
  FROM public.announcement_reads ar
  WHERE ar.announcement_id = announcement_id_param;

  -- Count eligible users
  IF course_id_var IS NULL THEN
    -- Global announcement - all active users
    SELECT COUNT(*) INTO total_eligible
    FROM public.users u
    WHERE u.is_active = true;
  ELSE
    -- Course-specific announcement - enrolled users
    SELECT COUNT(*) INTO total_eligible
    FROM public.user_course_enrollments uce
    JOIN public.users u ON u.id = uce.user_id
    WHERE uce.course_id = course_id_var 
    AND u.is_active = true;
  END IF;

  -- Calculate percentage
  IF total_eligible > 0 THEN
    read_percentage := ROUND((total_readers::NUMERIC / total_eligible::NUMERIC) * 100, 2);
  ELSE
    read_percentage := 0;
  END IF;

  RETURN QUERY SELECT total_readers, total_eligible, read_percentage;
END;
$$;

-- Create trigger for updating announcement updated_at
CREATE OR REPLACE FUNCTION public.update_announcement_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_announcement_updated_at();