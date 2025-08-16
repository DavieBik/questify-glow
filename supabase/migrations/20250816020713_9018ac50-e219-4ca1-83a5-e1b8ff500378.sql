-- First get a user ID to use as created_by
DO $$
DECLARE
  user_id uuid;
  core_curriculum_id uuid;
  advanced_curriculum_id uuid;
  course_ids uuid[];
  i integer;
BEGIN
  -- Get the first admin user ID
  SELECT id INTO user_id FROM public.users WHERE role = 'admin' LIMIT 1;
  
  -- If no admin user exists, get any user
  IF user_id IS NULL THEN
    SELECT id INTO user_id FROM public.users LIMIT 1;
  END IF;
  
  -- If still no user, create a placeholder
  IF user_id IS NULL THEN
    user_id := '00000000-0000-0000-0000-000000000001';
  END IF;

  -- Create "Core Disability Worker Compliance (Annual)" curriculum
  INSERT INTO public.curricula (name, description, created_by, organization_id) VALUES 
  ('Core Disability Worker Compliance (Annual)', 'Essential annual compliance training for all disability support workers covering fundamental skills and regulatory requirements.', user_id, get_default_org_id())
  RETURNING id INTO core_curriculum_id;
  
  -- Get course IDs in order
  SELECT ARRAY[
    (SELECT id FROM public.courses WHERE title = 'Disability Awareness and Inclusion'),
    (SELECT id FROM public.courses WHERE title = 'NDIS Fundamentals'),
    (SELECT id FROM public.courses WHERE title = 'Communication and Behaviour Support'),
    (SELECT id FROM public.courses WHERE title = 'Personal Care and Assistance'),
    (SELECT id FROM public.courses WHERE title = 'Community Participation and Social Inclusion')
  ] INTO course_ids;
  
  -- Insert curriculum items with due date offsets for core curriculum
  FOR i IN 1 .. array_length(course_ids, 1) LOOP
    IF course_ids[i] IS NOT NULL THEN
      INSERT INTO public.curriculum_items (curriculum_id, course_id, position, due_days_offset)
      VALUES (core_curriculum_id, course_ids[i], i, i * 30); -- 30, 60, 90, 120, 150 days
    END IF;
  END LOOP;

  -- Create "Advanced Support Skills" curriculum
  INSERT INTO public.curricula (name, description, created_by, organization_id) VALUES 
  ('Advanced Support Skills', 'Advanced training curriculum for experienced disability support workers focusing on specialized techniques and leadership skills.', user_id, get_default_org_id())
  RETURNING id INTO advanced_curriculum_id;
  
  -- Get course IDs for advanced curriculum
  SELECT ARRAY[
    (SELECT id FROM public.courses WHERE title = 'Communication and Behaviour Support'),
    (SELECT id FROM public.courses WHERE title = 'NDIS Fundamentals'),
    (SELECT id FROM public.courses WHERE title = 'Community Participation and Social Inclusion')
  ] INTO course_ids;
  
  -- Insert curriculum items with shorter due date offsets for advanced curriculum
  FOR i IN 1 .. array_length(course_ids, 1) LOOP
    IF course_ids[i] IS NOT NULL THEN
      INSERT INTO public.curriculum_items (curriculum_id, course_id, position, due_days_offset)
      VALUES (advanced_curriculum_id, course_ids[i], i, i * 21); -- 21, 42, 63 days
    END IF;
  END LOOP;
END $$;