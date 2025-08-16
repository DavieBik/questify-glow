-- Seed modules for Course 1: Disability Awareness and Inclusion
INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Understanding Disability Models', 'Learn about medical vs social models of disability and their impact on service delivery.', 'https://example.com/module1', 'video', 1, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Disability Awareness and Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Person-First Language', 'Master the principles of respectful communication and person-first language when supporting people with disabilities.', 'https://example.com/module2', 'quiz', 2, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Disability Awareness and Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Rights and Self-Determination', 'Explore human rights frameworks and supporting self-determination for people with disabilities.', 'https://example.com/module3', 'video', 3, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Disability Awareness and Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Creating Inclusive Environments', 'Practical strategies for removing barriers and creating accessible, inclusive spaces.', 'https://example.com/module4', 'quiz', 4, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Disability Awareness and Inclusion';

-- Seed modules for Course 2: NDIS Fundamentals  
INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'NDIS Overview and History', 'Introduction to the NDIS, its history, and key principles of choice and control.', 'https://example.com/ndis1', 'video', 1, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'NDIS Fundamentals';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'NDIS Plans and Goals', 'Understanding NDIS plans, goal setting, and the planning process.', 'https://example.com/ndis2', 'scorm', 2, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'NDIS Fundamentals';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Service Delivery Standards', 'NDIS Practice Standards and quality service delivery requirements.', 'https://example.com/ndis3', 'quiz', 3, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'NDIS Fundamentals';

-- Seed modules for Course 3: Communication and Behaviour Support
INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Positive Communication Strategies', 'Building rapport and effective communication techniques for diverse communication needs.', 'https://example.com/comm1', 'video', 1, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Communication and Behaviour Support';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Understanding Behaviour', 'Functions of behaviour and person-centred approaches to behaviour support.', 'https://example.com/comm2', 'scorm', 2, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Communication and Behaviour Support';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'De-escalation Techniques', 'Safe and effective de-escalation strategies and crisis prevention.', 'https://example.com/comm3', 'video', 3, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Communication and Behaviour Support';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Trauma-Informed Practice', 'Understanding trauma and implementing trauma-informed approaches in disability support.', 'https://example.com/comm4', 'quiz', 4, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Communication and Behaviour Support';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Documentation and Reporting', 'Accurate documentation of incidents and behaviour support strategies.', 'https://example.com/comm5', 'scorm', 5, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Communication and Behaviour Support';

-- Seed modules for Course 4: Personal Care and Assistance
INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Privacy and Dignity', 'Maintaining privacy, dignity and respect during personal care activities.', 'https://example.com/care1', 'video', 1, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Personal Care and Assistance';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Safe Manual Handling', 'Safe lifting, transferring and positioning techniques to prevent injury.', 'https://example.com/care2', 'scorm', 2, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Personal Care and Assistance';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Infection Control', 'Standard precautions and infection control procedures in personal care settings.', 'https://example.com/care3', 'quiz', 3, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Personal Care and Assistance';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Assistive Technology', 'Using and maintaining assistive devices and equipment safely.', 'https://example.com/care4', 'video', 4, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Personal Care and Assistance';

-- Seed modules for Course 5: Community Participation and Social Inclusion
INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Community Connections', 'Supporting people to build and maintain community relationships and networks.', 'https://example.com/community1', 'video', 1, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Community Participation and Social Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Goal Planning and Achievement', 'Collaborative goal setting and supporting people to achieve their aspirations.', 'https://example.com/community2', 'scorm', 2, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Community Participation and Social Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Accessibility and Universal Design', 'Identifying and addressing accessibility barriers in community settings.', 'https://example.com/community3', 'quiz', 3, true, 80, get_default_org_id()
FROM public.courses c WHERE c.title = 'Community Participation and Social Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Social Skills Development', 'Supporting the development of social and interpersonal skills.', 'https://example.com/community4', 'video', 4, false, 70, get_default_org_id()
FROM public.courses c WHERE c.title = 'Community Participation and Social Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Cultural Competency', 'Providing culturally safe and responsive disability support services.', 'https://example.com/community5', 'scorm', 5, false, 70, get_default_org_id()
FROM public.courses c WHERE c.title = 'Community Participation and Social Inclusion';

INSERT INTO public.modules (course_id, title, body, content_url, content_type, order_index, is_required, pass_threshold_percentage, organization_id) 
SELECT c.id, 'Evaluation and Continuous Improvement', 'Measuring outcomes and continuously improving support practices.', 'https://example.com/community6', 'quiz', 6, false, 70, get_default_org_id()
FROM public.courses c WHERE c.title = 'Community Participation and Social Inclusion';