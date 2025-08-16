-- Add missing fields to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS duration_minutes integer,
ADD COLUMN IF NOT EXISTS format text DEFAULT 'online' CHECK (format IN ('online', 'instructor_led', 'external'));

-- Add missing field to modules table  
ALTER TABLE public.modules
ADD COLUMN IF NOT EXISTS body text;

-- Update existing estimated_duration_minutes to duration_minutes if needed
UPDATE public.courses 
SET duration_minutes = estimated_duration_minutes 
WHERE duration_minutes IS NULL AND estimated_duration_minutes IS NOT NULL;

-- Create enum for course format
CREATE TYPE IF NOT EXISTS course_format AS ENUM ('online', 'instructor_led', 'external');

-- Alter column to use enum (after ensuring data compatibility)
UPDATE public.courses SET format = 'online' WHERE format IS NULL;
ALTER TABLE public.courses ALTER COLUMN format TYPE course_format USING format::course_format;

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

-- Seed modules for Course 1: Disability Awareness and Inclusion
INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Understanding Disability Models', 'Learn about medical vs social models of disability and their impact on service delivery.', 'https://example.com/module1', 1, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Disability Awareness and Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Person-First Language', 'Master the principles of respectful communication and person-first language when supporting people with disabilities.', 'https://example.com/module2', 2, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Disability Awareness and Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Rights and Self-Determination', 'Explore human rights frameworks and supporting self-determination for people with disabilities.', 'https://example.com/module3', 3, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Disability Awareness and Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Creating Inclusive Environments', 'Practical strategies for removing barriers and creating accessible, inclusive spaces.', 'https://example.com/module4', 4, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Disability Awareness and Inclusion';

-- Seed modules for Course 2: NDIS Fundamentals  
INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'NDIS Overview and History', 'Introduction to the NDIS, its history, and key principles of choice and control.', 'https://example.com/ndis1', 1, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'NDIS Fundamentals';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'NDIS Plans and Goals', 'Understanding NDIS plans, goal setting, and the planning process.', 'https://example.com/ndis2', 2, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'NDIS Fundamentals';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Service Delivery Standards', 'NDIS Practice Standards and quality service delivery requirements.', 'https://example.com/ndis3', 3, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'NDIS Fundamentals';

-- Seed modules for Course 3: Communication and Behaviour Support
INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Positive Communication Strategies', 'Building rapport and effective communication techniques for diverse communication needs.', 'https://example.com/comm1', 1, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Communication and Behaviour Support';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Understanding Behaviour', 'Functions of behaviour and person-centred approaches to behaviour support.', 'https://example.com/comm2', 2, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Communication and Behaviour Support';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'De-escalation Techniques', 'Safe and effective de-escalation strategies and crisis prevention.', 'https://example.com/comm3', 3, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Communication and Behaviour Support';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Trauma-Informed Practice', 'Understanding trauma and implementing trauma-informed approaches in disability support.', 'https://example.com/comm4', 4, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Communication and Behaviour Support';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Documentation and Reporting', 'Accurate documentation of incidents and behaviour support strategies.', 'https://example.com/comm5', 5, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Communication and Behaviour Support';

-- Seed modules for Course 4: Personal Care and Assistance
INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Privacy and Dignity', 'Maintaining privacy, dignity and respect during personal care activities.', 'https://example.com/care1', 1, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Personal Care and Assistance';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Safe Manual Handling', 'Safe lifting, transferring and positioning techniques to prevent injury.', 'https://example.com/care2', 2, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Personal Care and Assistance';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Infection Control', 'Standard precautions and infection control procedures in personal care settings.', 'https://example.com/care3', 3, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Personal Care and Assistance';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Assistive Technology', 'Using and maintaining assistive devices and equipment safely.', 'https://example.com/care4', 4, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Personal Care and Assistance';

-- Seed modules for Course 5: Community Participation and Social Inclusion
INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Community Connections', 'Supporting people to build and maintain community relationships and networks.', 'https://example.com/community1', 1, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Community Participation and Social Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Goal Planning and Achievement', 'Collaborative goal setting and supporting people to achieve their aspirations.', 'https://example.com/community2', 2, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Community Participation and Social Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Accessibility and Universal Design', 'Identifying and addressing accessibility barriers in community settings.', 'https://example.com/community3', 3, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Community Participation and Social Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Social Skills Development', 'Supporting the development of social and interpersonal skills.', 'https://example.com/community4', 4, false, 70, get_default_org_id()
FROM public.courses c WHERE c.title = 'Community Participation and Social Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Cultural Competency', 'Providing culturally safe and responsive disability support services.', 'https://example.com/community5', 5, false, 70, get_default_org_id()
FROM public.courses c WHERE c.title = 'Community Participation and Social Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Evaluation and Continuous Improvement', 'Measuring outcomes and continuously improving support practices.', 'https://example.com/community6', 6, false, 70, get_default_org_id()
FROM public.courses c WHERE c.title = 'Community Participation and Social Inclusion';