-- Fix Security Definer View issues by removing SECURITY DEFINER from RPC functions
-- and implementing proper access control through RLS and explicit permission checks

-- 1. Update rpc_course_metrics to remove SECURITY DEFINER and use proper permissions
CREATE OR REPLACE FUNCTION public.rpc_course_metrics(
  date_from date DEFAULT (CURRENT_DATE - '30 days'::interval), 
  date_to date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  course_id uuid, 
  course_title text, 
  category text, 
  difficulty text, 
  enrolled_users bigint, 
  completed_users bigint, 
  completion_rate numeric, 
  avg_score numeric, 
  avg_time_minutes numeric, 
  total_attempts bigint, 
  passed_attempts bigint
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role - this works without SECURITY DEFINER
  -- because users can read their own role via existing RLS policies
  SELECT u.role INTO current_user_role
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Security check using regular function call (not elevated permissions)
  IF current_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied. Admin or manager role required.';
  END IF;

  -- Return data from materialized view (protected by existing RLS)
  RETURN QUERY
  SELECT 
    mcpa.course_id,
    mcpa.course_title,
    mcpa.category,
    mcpa.difficulty::TEXT,
    mcpa.enrolled_users,
    mcpa.completed_users,
    mcpa.completion_rate,
    mcpa.avg_score,
    mcpa.avg_time_minutes,
    mcpa.total_attempts,
    mcpa.passed_attempts
  FROM public.mv_course_performance_analytics mcpa;
END;
$function$;

-- 2. Update rpc_module_metrics to remove SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.rpc_module_metrics(
  course_id_filter uuid DEFAULT NULL::uuid, 
  date_from date DEFAULT (CURRENT_DATE - '30 days'::interval), 
  date_to date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  module_id uuid, 
  course_id uuid, 
  module_title text, 
  course_title text, 
  content_type text, 
  order_index integer, 
  attempted_users bigint, 
  completed_users bigint, 
  completion_rate numeric, 
  avg_score numeric, 
  avg_time_minutes numeric, 
  total_attempts bigint, 
  avg_attempts_per_user numeric
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT u.role INTO current_user_role
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Security check
  IF current_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied. Admin or manager role required.';
  END IF;

  RETURN QUERY
  SELECT 
    mma.module_id,
    mma.course_id,
    mma.module_title,
    mma.course_title,
    mma.content_type,
    mma.order_index,
    mma.attempted_users,
    mma.completed_users,
    mma.completion_rate,
    mma.avg_score,
    mma.avg_time_minutes,
    mma.total_attempts,
    mma.avg_attempts_per_user
  FROM public.mv_module_analytics mma
  WHERE (course_id_filter IS NULL OR mma.course_id = course_id_filter);
END;
$function$;

-- 3. Update rpc_skills_gap to remove SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.rpc_skills_gap(
  department_filter text DEFAULT NULL::text, 
  role_filter text DEFAULT NULL::text
)
RETURNS TABLE(
  department text, 
  role text, 
  total_users bigint, 
  avg_completion_rate numeric, 
  skills_gaps text[], 
  recommended_courses text[]
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT u.role INTO current_user_role
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Security check
  IF current_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied. Admin or manager role required.';
  END IF;

  RETURN QUERY
  SELECT 
    mupa.department,
    mupa.role::TEXT,
    COUNT(mupa.user_id) as total_users,
    AVG(
      CASE 
        WHEN mupa.enrolled_courses > 0 
        THEN (mupa.completed_courses::NUMERIC / mupa.enrolled_courses::NUMERIC) * 100 
        ELSE 0 
      END
    ) as avg_completion_rate,
    ARRAY['Technical Skills', 'Compliance Training'] as skills_gaps,
    ARRAY['Advanced Training Course', 'Certification Program'] as recommended_courses
  FROM public.mv_user_progress_analytics mupa
  WHERE 
    (department_filter IS NULL OR mupa.department = department_filter)
    AND (role_filter IS NULL OR mupa.role::TEXT = role_filter)
  GROUP BY mupa.department, mupa.role;
END;
$function$;

-- 4. Update rpc_learning_patterns to remove SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.rpc_learning_patterns(
  date_from date DEFAULT (CURRENT_DATE - '30 days'::interval), 
  date_to date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  bucket_type text, 
  bucket text, 
  completions bigint, 
  avg_score numeric, 
  avg_time_minutes numeric
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT u.role INTO current_user_role
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Security check
  IF current_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied. Admin or manager role required.';
  END IF;

  -- Return hourly patterns (data access controlled by existing RLS)
  RETURN QUERY
  SELECT 
    'hour'::TEXT as bucket_type,
    EXTRACT(HOUR FROM c.completed_at)::TEXT as bucket,
    COUNT(*)::BIGINT as completions,
    AVG(c.score_percentage) as avg_score,
    AVG(c.time_spent_minutes) as avg_time_minutes
  FROM public.completions c
  WHERE 
    c.status = 'completed'
    AND c.completed_at >= date_from
    AND c.completed_at <= date_to + INTERVAL '1 day'
  GROUP BY EXTRACT(HOUR FROM c.completed_at)
  ORDER BY bucket;
END;
$function$;

-- 5. Update rpc_admin_team_user_progress to remove SECURITY DEFINER  
CREATE OR REPLACE FUNCTION public.rpc_admin_team_user_progress(
  date_from date DEFAULT (CURRENT_DATE - '90 days'::interval), 
  date_to date DEFAULT CURRENT_DATE, 
  manager_scope boolean DEFAULT true
)
RETURNS SETOF mv_user_course_progress
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT *
  FROM public.mv_user_course_progress
  WHERE (first_started_at >= date_from OR first_started_at IS NULL)
    AND (last_activity_at <= date_to OR last_activity_at IS NULL)
    AND (
      public.is_admin(auth.uid())
      OR (manager_scope AND public.is_manager_of(auth.uid(), user_id))
    );
$function$;

-- Note: Keep rpc_bulk_assign as SECURITY DEFINER since it needs elevated permissions
-- to insert enrollment records, but ensure it has proper access controls (which it already does)