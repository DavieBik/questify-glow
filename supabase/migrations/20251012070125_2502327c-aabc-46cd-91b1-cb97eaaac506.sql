-- CRITICAL SECURITY FIX: Separate user roles from users table
-- This prevents privilege escalation attacks and RLS recursion issues

-- Step 1: Create user_roles table with proper security
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create security definer function to check roles
-- This bypasses RLS and prevents recursive policy issues
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Step 3: Migrate existing roles from users table to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role 
FROM public.users 
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Step 5: Update existing RLS policies to use has_role() function
-- This eliminates the recursive policy anti-pattern

-- Fix users table policies
DROP POLICY IF EXISTS "users_admin_full_access" ON public.users;
CREATE POLICY "users_admin_full_access" 
  ON public.users 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "users_manager_team_access" ON public.users;
CREATE POLICY "users_manager_team_access"
  ON public.users
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'manager') 
    AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- Fix courses table policies  
DROP POLICY IF EXISTS "org_admins_managers_can_manage_courses" ON public.courses;
CREATE POLICY "org_admins_managers_can_manage_courses"
  ON public.courses
  FOR ALL
  USING (
    organization_id = get_default_org_id() 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    organization_id = get_default_org_id() 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- Fix modules table policies
DROP POLICY IF EXISTS "org_admins_managers_can_manage_modules" ON public.modules;
CREATE POLICY "org_admins_managers_can_manage_modules"
  ON public.modules
  FOR ALL
  USING (
    organization_id = get_default_org_id() 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    organization_id = get_default_org_id() 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- Fix completions table policies
DROP POLICY IF EXISTS "Admins can manage all completions" ON public.completions;
CREATE POLICY "Admins can manage all completions"
  ON public.completions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix certificates table policies
DROP POLICY IF EXISTS "Admins can manage all certificates" ON public.certificates;
CREATE POLICY "Admins can manage all certificates"
  ON public.certificates
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix enrollments table policies
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage all enrollments"
  ON public.enrollments
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix badges table policies
DROP POLICY IF EXISTS "Admins can manage badges" ON public.badges;
CREATE POLICY "Admins can manage badges"
  ON public.badges
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix announcements policies
DROP POLICY IF EXISTS "admins_managers_can_create_announcements_v2" ON public.announcements;
CREATE POLICY "admins_managers_can_create_announcements_v2"
  ON public.announcements
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by 
    AND organization_id = get_default_org_id() 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

DROP POLICY IF EXISTS "admins_managers_can_delete_announcements" ON public.announcements;
CREATE POLICY "admins_managers_can_delete_announcements"
  ON public.announcements
  FOR DELETE
  USING (
    organization_id = get_default_org_id() 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

DROP POLICY IF EXISTS "creators_admins_can_update_announcements" ON public.announcements;
CREATE POLICY "creators_admins_can_update_announcements"
  ON public.announcements
  FOR UPDATE
  USING (
    organization_id = get_default_org_id() 
    AND (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- Fix app_settings policies
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
CREATE POLICY "Admins can update app settings"
  ON public.app_settings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix approvals policies
DROP POLICY IF EXISTS "Managers can update approval requests" ON public.approvals;
CREATE POLICY "Managers can update approval requests"
  ON public.approvals
  FOR UPDATE
  USING (
    organization_id = get_default_org_id() 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

DROP POLICY IF EXISTS "Managers can view org approval requests" ON public.approvals;
CREATE POLICY "Managers can view org approval requests"
  ON public.approvals
  FOR SELECT
  USING (
    organization_id = get_default_org_id() 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- Fix notification_logs policies
DROP POLICY IF EXISTS "Admins can view all notification logs" ON public.notification_logs;
CREATE POLICY "Admins can view all notification logs"
  ON public.notification_logs
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- Fix curricula policies
DROP POLICY IF EXISTS "org_admins_managers_can_manage_curricula" ON public.curricula;
CREATE POLICY "org_admins_managers_can_manage_curricula"
  ON public.curricula
  FOR ALL
  USING (
    organization_id = get_default_org_id() 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    organization_id = get_default_org_id() 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- Fix curriculum_assignments policies
DROP POLICY IF EXISTS "org_admins_managers_can_manage_curriculum_assignments" ON public.curriculum_assignments;
CREATE POLICY "org_admins_managers_can_manage_curriculum_assignments"
  ON public.curriculum_assignments
  FOR ALL
  USING (
    organization_id = get_default_org_id() 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    organization_id = get_default_org_id() 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

DROP POLICY IF EXISTS "org_members_can_view_curriculum_assignments" ON public.curriculum_assignments;
CREATE POLICY "org_members_can_view_curriculum_assignments"
  ON public.curriculum_assignments
  FOR SELECT
  USING (
    organization_id = get_default_org_id() 
    AND (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- Fix curriculum_items policies
DROP POLICY IF EXISTS "org_admins_managers_can_manage_curriculum_items" ON public.curriculum_items;
CREATE POLICY "org_admins_managers_can_manage_curriculum_items"
  ON public.curriculum_items
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.curricula c WHERE c.id = curriculum_items.curriculum_id AND c.organization_id = get_default_org_id())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.curricula c WHERE c.id = curriculum_items.curriculum_id AND c.organization_id = get_default_org_id())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- Fix course_prerequisites policies
DROP POLICY IF EXISTS "Admins and managers can manage course prerequisites" ON public.course_prerequisites;
CREATE POLICY "Admins and managers can manage course prerequisites"
  ON public.course_prerequisites
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Fix forums policies
DROP POLICY IF EXISTS "Admins and managers can manage all forums" ON public.forums;
CREATE POLICY "Admins and managers can manage all forums"
  ON public.forums
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Fix forum_posts policies
DROP POLICY IF EXISTS "Admins and managers can manage all posts" ON public.forum_posts;
CREATE POLICY "Admins and managers can manage all posts"
  ON public.forum_posts
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Fix groups policies
DROP POLICY IF EXISTS "Admins and managers can manage all groups" ON public.groups;
CREATE POLICY "Admins and managers can manage all groups"
  ON public.groups
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Fix group_members policies
DROP POLICY IF EXISTS "Admins and managers can manage group members" ON public.group_members;
CREATE POLICY "Admins and managers can manage group members"
  ON public.group_members
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Fix import_jobs policies
DROP POLICY IF EXISTS "Admins can manage all import jobs" ON public.import_jobs;
CREATE POLICY "Admins can manage all import jobs"
  ON public.import_jobs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 6: Update security definer functions that still reference users.role
CREATE OR REPLACE FUNCTION public.change_user_organization(target_user_id uuid, new_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role text;
  current_user_org uuid;
BEGIN
  -- Use has_role instead of querying users table
  IF NOT (public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Insufficient privileges to change organization membership';
  END IF;
  
  -- Update user's organization
  UPDATE public.users 
  SET organization_id = new_org_id 
  WHERE id = target_user_id;
  
  -- Add to new organization as member if not exists
  IF new_org_id IS NOT NULL THEN
    INSERT INTO public.org_members (organization_id, user_id, role)
    VALUES (new_org_id, target_user_id, 'worker')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;
  
  RETURN true;
END;
$$;

-- Step 7: Fix remaining functions missing SET search_path
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

-- Step 8: Create trigger to keep user_roles in sync when users.role is updated
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

CREATE TRIGGER sync_user_role_trigger
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_role_to_user_roles();

-- Step 9: Add helpful comment
COMMENT ON TABLE public.user_roles IS 'Stores user roles separately from users table to prevent privilege escalation attacks. Use has_role() function in RLS policies instead of querying users.role.';