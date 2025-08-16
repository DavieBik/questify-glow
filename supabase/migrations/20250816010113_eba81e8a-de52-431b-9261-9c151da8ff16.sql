-- Add due_at field to user_course_enrollments if not exists
ALTER TABLE public.user_course_enrollments 
ADD COLUMN IF NOT EXISTS due_at TIMESTAMP WITH TIME ZONE;

-- Create notification_logs table to track sent notifications
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  enrollment_id UUID,
  notification_type TEXT NOT NULL,
  notification_method TEXT NOT NULL DEFAULT 'email',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  template_used TEXT,
  organization_id UUID NOT NULL DEFAULT get_default_org_id(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add constraints
ALTER TABLE public.notification_logs 
ADD CONSTRAINT notification_logs_type_check 
CHECK (notification_type IN ('due_soon', 'overdue', 'enrollment_reminder', 'completion_reminder'));

ALTER TABLE public.notification_logs 
ADD CONSTRAINT notification_logs_status_check 
CHECK (status IN ('sent', 'failed', 'pending'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON public.notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_user_course_enrollments_due_at ON public.user_course_enrollments(due_at);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_logs
CREATE POLICY "Users can view their own notification logs" 
ON public.notification_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification logs" 
ON public.notification_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager') 
    AND u.organization_id = get_default_org_id()
  )
);

CREATE POLICY "System can insert notification logs" 
ON public.notification_logs 
FOR INSERT 
WITH CHECK (organization_id = get_default_org_id());

-- Function to set due dates for new enrollments
CREATE OR REPLACE FUNCTION public.set_enrollment_due_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_duration INTEGER;
BEGIN
  -- Get course estimated duration
  SELECT estimated_duration_minutes INTO course_duration
  FROM public.courses
  WHERE id = NEW.course_id;
  
  -- Set due date based on course duration (add 30 days if no duration, or duration + 7 days buffer)
  IF course_duration IS NULL THEN
    NEW.due_at := NEW.enrollment_date + INTERVAL '30 days';
  ELSE
    -- Add 7 days buffer to the estimated duration
    NEW.due_at := NEW.enrollment_date + INTERVAL '7 days' + (course_duration || ' minutes')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set due dates
DROP TRIGGER IF EXISTS set_enrollment_due_date_trigger ON public.user_course_enrollments;
CREATE TRIGGER set_enrollment_due_date_trigger
BEFORE INSERT ON public.user_course_enrollments
FOR EACH ROW
WHEN (NEW.due_at IS NULL)
EXECUTE FUNCTION public.set_enrollment_due_date();

-- Function to get users with due/overdue enrollments
CREATE OR REPLACE FUNCTION public.get_due_enrollments(
  days_ahead INTEGER DEFAULT 3
)
RETURNS TABLE(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  enrollment_id UUID,
  course_id UUID,
  course_title TEXT,
  due_at TIMESTAMP WITH TIME ZONE,
  days_until_due INTEGER,
  is_overdue BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uce.user_id,
    u.email as user_email,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
    uce.id as enrollment_id,
    uce.course_id,
    c.title as course_title,
    uce.due_at,
    EXTRACT(days FROM uce.due_at - now())::INTEGER as days_until_due,
    (uce.due_at < now()) as is_overdue
  FROM public.user_course_enrollments uce
  JOIN public.users u ON u.id = uce.user_id
  JOIN public.courses c ON c.id = uce.course_id
  WHERE uce.status IN ('enrolled', 'in_progress')
    AND uce.due_at IS NOT NULL
    AND u.is_active = true
    AND (
      -- Due soon (within specified days)
      (uce.due_at BETWEEN now() AND now() + (days_ahead || ' days')::INTERVAL)
      OR 
      -- Overdue
      (uce.due_at < now())
    )
  ORDER BY uce.due_at ASC;
END;
$$;