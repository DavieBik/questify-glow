-- CRITICAL SECURITY FIX: Update RLS policies to use has_role() (Part 2)
-- This eliminates recursive policy anti-patterns

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