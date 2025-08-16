-- Seed curricula data
-- Create "Core Disability Worker Compliance (Annual)" curriculum
INSERT INTO public.curricula (name, description, created_by, organization_id) VALUES 
('Core Disability Worker Compliance (Annual)', 'Essential annual compliance training for all disability support workers covering fundamental skills and regulatory requirements.', auth.uid(), get_default_org_id());

-- Get the curriculum ID for Core Disability Worker Compliance
DO $$
DECLARE
  core_curriculum_id uuid;
  course_ids uuid[];
  i integer;
BEGIN
  -- Get curriculum ID
  SELECT id INTO core_curriculum_id FROM public.curricula WHERE name = 'Core Disability Worker Compliance (Annual)';
  
  -- Get course IDs in order
  SELECT ARRAY[
    (SELECT id FROM public.courses WHERE title = 'Disability Awareness and Inclusion'),
    (SELECT id FROM public.courses WHERE title = 'NDIS Fundamentals'),
    (SELECT id FROM public.courses WHERE title = 'Communication and Behaviour Support'),
    (SELECT id FROM public.courses WHERE title = 'Personal Care and Assistance'),
    (SELECT id FROM public.courses WHERE title = 'Community Participation and Social Inclusion')
  ] INTO course_ids;
  
  -- Insert curriculum items with due date offsets
  FOR i IN 1 .. array_length(course_ids, 1) LOOP
    INSERT INTO public.curriculum_items (curriculum_id, course_id, position, due_days_offset)
    VALUES (core_curriculum_id, course_ids[i], i, i * 30); -- 30, 60, 90, 120, 150 days
  END LOOP;
END $$;

-- Create "Advanced Support Skills" curriculum
INSERT INTO public.curricula (name, description, created_by, organization_id) VALUES 
('Advanced Support Skills', 'Advanced training curriculum for experienced disability support workers focusing on specialized techniques and leadership skills.', auth.uid(), get_default_org_id());

-- Add selected courses to Advanced Support Skills curriculum
DO $$
DECLARE
  advanced_curriculum_id uuid;
  course_ids uuid[];
  i integer;
BEGIN
  -- Get curriculum ID
  SELECT id INTO advanced_curriculum_id FROM public.curricula WHERE name = 'Advanced Support Skills';
  
  -- Get course IDs for advanced curriculum (subset of courses with different focus)
  SELECT ARRAY[
    (SELECT id FROM public.courses WHERE title = 'Communication and Behaviour Support'),
    (SELECT id FROM public.courses WHERE title = 'NDIS Fundamentals'),
    (SELECT id FROM public.courses WHERE title = 'Community Participation and Social Inclusion')
  ] INTO course_ids;
  
  -- Insert curriculum items with shorter due date offsets
  FOR i IN 1 .. array_length(course_ids, 1) LOOP
    INSERT INTO public.curriculum_items (curriculum_id, course_id, position, due_days_offset)
    VALUES (advanced_curriculum_id, course_ids[i], i, i * 21); -- 21, 42, 63 days
  END LOOP;
END $$;