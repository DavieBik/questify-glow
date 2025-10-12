-- CRITICAL SECURITY FIX: Fix remaining functions and add role sync (Part 3)

-- Update security definer functions that still reference users.role
CREATE OR REPLACE FUNCTION public.change_user_organization(target_user_id uuid, new_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use has_role instead of querying users table
  IF NOT (public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Insufficient privileges to change organization membership';
  END IF;
  
  UPDATE public.users 
  SET organization_id = new_org_id 
  WHERE id = target_user_id;
  
  IF new_org_id IS NOT NULL THEN
    INSERT INTO public.org_members (organization_id, user_id, role)
    VALUES (new_org_id, target_user_id, 'worker')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;
  
  RETURN true;
END;
$$;

-- Fix remaining trigger functions missing SET search_path
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_enrollments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_enroll_unlocked_courses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unlocked_course_id UUID;
BEGIN
  FOR unlocked_course_id IN 
    SELECT DISTINCT cp.course_id
    FROM public.course_prerequisites cp
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_course_enrollments uce
      WHERE uce.course_id = cp.course_id AND uce.user_id = NEW.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.course_prerequisites cp2
      WHERE cp2.course_id = cp.course_id
      AND NOT EXISTS (
        SELECT 1 FROM public.completions c
        WHERE c.course_id = cp2.prerequisite_course_id 
        AND c.user_id = NEW.user_id 
        AND c.status = 'completed'
      )
    )
  LOOP
    INSERT INTO public.user_course_enrollments (user_id, course_id, status)
    VALUES (NEW.user_id, unlocked_course_id, 'enrolled')
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END LOOP;

  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.completions 
    SET points = 10 
    WHERE id = NEW.id AND points IS NULL;
    
    UPDATE public.users 
    SET last_completion_date = CURRENT_DATE
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_enrollment_due_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_duration INTEGER;
BEGIN
  SELECT estimated_duration_minutes INTO course_duration
  FROM public.courses
  WHERE id = NEW.course_id;
  
  IF course_duration IS NULL THEN
    NEW.due_at := NEW.enrollment_date + INTERVAL '30 days';
  ELSE
    NEW.due_at := NEW.enrollment_date + INTERVAL '7 days' + (course_duration || ' minutes')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_curriculum_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_curriculum_assignment record;
  v_total_items integer;
  v_completed_items integer;
  v_new_status curriculum_assignment_status;
BEGIN
  FOR v_curriculum_assignment IN
    SELECT ca.id, ca.curriculum_id, ca.user_id, ca.due_at
    FROM public.curriculum_assignments ca
    JOIN public.curriculum_items ci ON ci.curriculum_id = ca.curriculum_id
    WHERE ca.user_id = NEW.user_id 
    AND ci.course_id = NEW.course_id
  LOOP
    SELECT COUNT(*) INTO v_total_items
    FROM public.curriculum_items ci
    WHERE ci.curriculum_id = v_curriculum_assignment.curriculum_id;

    SELECT COUNT(*) INTO v_completed_items
    FROM public.curriculum_items ci
    JOIN public.user_course_enrollments uce ON uce.course_id = ci.course_id
    WHERE ci.curriculum_id = v_curriculum_assignment.curriculum_id
    AND uce.user_id = v_curriculum_assignment.user_id
    AND uce.status = 'completed';

    IF v_completed_items = v_total_items THEN
      v_new_status := 'completed';
    ELSIF v_completed_items > 0 THEN
      v_new_status := 'in_progress';
    ELSIF v_curriculum_assignment.due_at IS NOT NULL AND v_curriculum_assignment.due_at < now() THEN
      v_new_status := 'overdue';
    ELSE
      v_new_status := 'assigned';
    END IF;

    UPDATE public.curriculum_assignments
    SET 
      status = v_new_status,
      updated_at = now()
    WHERE id = v_curriculum_assignment.id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    role,
    organization_id,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
    'worker',
    (SELECT id FROM organizations LIMIT 1),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Also create role entry
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'worker')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to keep user_roles in sync when users.role is updated
CREATE OR REPLACE FUNCTION public.sync_user_role_to_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove old role if it changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = OLD.role;
    
    -- Add new role
    IF NEW.role IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, NEW.role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS sync_user_role_trigger ON public.users;

-- Create the sync trigger
CREATE TRIGGER sync_user_role_trigger
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_role_to_user_roles();