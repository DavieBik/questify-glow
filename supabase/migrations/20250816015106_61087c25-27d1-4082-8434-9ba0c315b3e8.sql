-- Add missing fields to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS duration_minutes integer,
ADD COLUMN IF NOT EXISTS format text DEFAULT 'online';

-- Add constraint to format column
ALTER TABLE public.courses 
ADD CONSTRAINT format_check CHECK (format IN ('online', 'instructor_led', 'external'));

-- Add missing field to modules table  
ALTER TABLE public.modules
ADD COLUMN IF NOT EXISTS body text;

-- Update existing estimated_duration_minutes to duration_minutes if needed
UPDATE public.courses 
SET duration_minutes = estimated_duration_minutes 
WHERE duration_minutes IS NULL AND estimated_duration_minutes IS NOT NULL;

-- Update RLS policies for courses
DROP POLICY IF EXISTS "courses_select_policy" ON public.courses;
DROP POLICY IF EXISTS "courses_manage_policy" ON public.courses;

CREATE POLICY "org_members_can_view_active_courses" 
ON public.courses FOR SELECT 
USING (
  is_active = true 
  AND organization_id = get_default_org_id() 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "org_admins_managers_can_manage_courses" 
ON public.courses FOR ALL 
USING (
  organization_id = get_default_org_id() 
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
)
WITH CHECK (
  organization_id = get_default_org_id() 
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
);

-- Update RLS policies for modules
DROP POLICY IF EXISTS "Users can view modules for active courses" ON public.modules;
DROP POLICY IF EXISTS "org_modules_manage_policy" ON public.modules;

CREATE POLICY "org_members_can_view_course_modules" 
ON public.modules FOR SELECT 
USING (
  organization_id = get_default_org_id() 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = modules.course_id 
    AND c.is_active = true
  )
);

CREATE POLICY "org_admins_managers_can_manage_modules" 
ON public.modules FOR ALL 
USING (
  organization_id = get_default_org_id() 
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
)
WITH CHECK (
  organization_id = get_default_org_id() 
  AND EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'manager')
    AND u.organization_id = get_default_org_id()
  )
);

-- Seed disability-worker courses with modules
INSERT INTO public.courses (title, description, category, duration_minutes, format, organization_id, created_by) VALUES 
('Disability Awareness and Inclusion', 'Comprehensive introduction to disability awareness, person-first language, and creating inclusive environments for people with disabilities.', 'Disability Studies', 240, 'online', get_default_org_id(), auth.uid()),
('NDIS Fundamentals', 'Complete guide to the National Disability Insurance Scheme including participant rights, plan management, and service delivery standards.', 'NDIS', 180, 'online', get_default_org_id(), auth.uid()),
('Communication and Behaviour Support', 'Evidence-based strategies for positive communication, de-escalation techniques, and person-centred behaviour support approaches.', 'Communication', 200, 'instructor_led', get_default_org_id(), auth.uid()),
('Personal Care and Assistance', 'Safe and dignified personal care practices, manual handling, infection control, and maintaining client privacy and dignity.', 'Personal Care', 160, 'online', get_default_org_id(), auth.uid()),
('Community Participation and Social Inclusion', 'Supporting people with disabilities to participate in community activities, develop social networks, and achieve their goals.', 'Community Support', 150, 'online', get_default_org_id(), auth.uid());