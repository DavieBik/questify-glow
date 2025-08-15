-- Create missing RPC functions for analytics and set up scheduled refresh

-- 1. Create rpc_retention_metrics function (if not exists)
CREATE OR REPLACE FUNCTION public.rpc_retention_metrics()
RETURNS TABLE(
  cohort_week date,
  users_started bigint,
  retained_30d bigint,
  retained_60d bigint,
  retained_90d bigint,
  retention_rate_30d numeric,
  retention_rate_60d numeric,
  retention_rate_90d numeric
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role for security check
  SELECT u.role INTO current_user_role
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Security check - only admin and manager can access
  IF current_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied. Admin or manager role required.';
  END IF;

  -- Return retention metrics calculation
  RETURN QUERY
  WITH cohort_data AS (
    SELECT 
      date_trunc('week', uce.enrollment_date::date) as cohort_week,
      COUNT(DISTINCT uce.user_id) as users_started
    FROM public.user_course_enrollments uce
    WHERE uce.enrollment_date >= CURRENT_DATE - INTERVAL '120 days'
    GROUP BY date_trunc('week', uce.enrollment_date::date)
  ),
  retention_data AS (
    SELECT 
      cd.cohort_week,
      cd.users_started,
      COUNT(DISTINCT CASE 
        WHEN c.completed_at <= cd.cohort_week + INTERVAL '30 days' 
        THEN c.user_id 
      END) as retained_30d,
      COUNT(DISTINCT CASE 
        WHEN c.completed_at <= cd.cohort_week + INTERVAL '60 days' 
        THEN c.user_id 
      END) as retained_60d,
      COUNT(DISTINCT CASE 
        WHEN c.completed_at <= cd.cohort_week + INTERVAL '90 days' 
        THEN c.user_id 
      END) as retained_90d
    FROM cohort_data cd
    LEFT JOIN public.user_course_enrollments uce ON 
      date_trunc('week', uce.enrollment_date::date) = cd.cohort_week
    LEFT JOIN public.completions c ON 
      c.user_id = uce.user_id AND c.status = 'completed'
    GROUP BY cd.cohort_week, cd.users_started
  )
  SELECT 
    rd.cohort_week::date,
    rd.users_started,
    rd.retained_30d,
    rd.retained_60d,
    rd.retained_90d,
    CASE WHEN rd.users_started > 0 
      THEN ROUND((rd.retained_30d::numeric / rd.users_started::numeric) * 100, 2) 
      ELSE 0 
    END as retention_rate_30d,
    CASE WHEN rd.users_started > 0 
      THEN ROUND((rd.retained_60d::numeric / rd.users_started::numeric) * 100, 2) 
      ELSE 0 
    END as retention_rate_60d,
    CASE WHEN rd.users_started > 0 
      THEN ROUND((rd.retained_90d::numeric / rd.users_started::numeric) * 100, 2) 
      ELSE 0 
    END as retention_rate_90d
  FROM retention_data rd
  ORDER BY rd.cohort_week DESC;
END;
$$;

-- 2. Create rpc_admin_team_user_progress function (if not exists or needs updating)
CREATE OR REPLACE FUNCTION public.rpc_admin_team_user_progress(
  date_from date DEFAULT (CURRENT_DATE - '90 days'::interval), 
  date_to date DEFAULT CURRENT_DATE, 
  manager_scope boolean DEFAULT false
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  department text,
  role user_role,
  enrolled_courses bigint,
  completed_courses bigint,
  completion_rate numeric,
  average_score numeric,
  total_hours numeric,
  last_activity date,
  engagement_score numeric
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role for security check
  SELECT u.role INTO current_user_role
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Security check
  IF current_user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied. Admin or manager role required.';
  END IF;

  -- Return user progress data
  RETURN QUERY
  SELECT 
    u.id as user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
    COALESCE(u.department, 'Unassigned') as department,
    u.role,
    COUNT(DISTINCT uce.id) as enrolled_courses,
    COUNT(DISTINCT CASE WHEN uce.status = 'completed' THEN uce.id END) as completed_courses,
    CASE 
      WHEN COUNT(DISTINCT uce.id) > 0 
      THEN ROUND((COUNT(DISTINCT CASE WHEN uce.status = 'completed' THEN uce.id END)::numeric / COUNT(DISTINCT uce.id)::numeric) * 100, 2)
      ELSE 0 
    END as completion_rate,
    COALESCE(AVG(c.score_percentage), 0) as average_score,
    COALESCE(SUM(c.time_spent_minutes), 0) / 60.0 as total_hours,
    MAX(c.completed_at)::date as last_activity,
    CASE 
      WHEN COUNT(DISTINCT uce.id) > 0 AND AVG(c.score_percentage) > 0
      THEN LEAST(100, (COUNT(DISTINCT CASE WHEN uce.status = 'completed' THEN uce.id END) * 25) + (AVG(c.score_percentage) * 0.5))
      ELSE 0 
    END as engagement_score
  FROM public.users u
  LEFT JOIN public.user_course_enrollments uce ON u.id = uce.user_id
    AND uce.enrollment_date BETWEEN date_from AND date_to
  LEFT JOIN public.completions c ON c.user_id = u.id
    AND c.completed_at BETWEEN date_from AND (date_to + INTERVAL '1 day')
  WHERE u.is_active = true
    AND (NOT manager_scope OR current_user_role = 'admin')
  GROUP BY u.id, u.first_name, u.last_name, u.email, u.department, u.role
  ORDER BY completion_rate DESC, average_score DESC;
END;
$$;

-- 3. Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Create scheduled job to refresh materialized views every hour
SELECT cron.schedule(
    'refresh-analytics-views',
    '0 * * * *', -- Every hour at minute 0
    $$
    -- Refresh all materialized views used by analytics
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_course_progress;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_course_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_retention_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_progress_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_course_performance_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_module_analytics;
    $$
);

-- 5. Create manual refresh function for admin use
CREATE OR REPLACE FUNCTION public.refresh_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT u.role INTO current_user_role
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Only admins can manually refresh
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Refresh all materialized views
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_course_progress;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_course_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_retention_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_progress_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_course_performance_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_module_analytics;
  
  -- Log the refresh
  INSERT INTO public.security_audit_log (action, resource, details, user_id)
  VALUES (
    'ANALYTICS_REFRESH',
    'materialized_views',
    '{"refreshed_at": "' || now() || '", "method": "manual"}'::jsonb,
    auth.uid()
  );
END;
$$;