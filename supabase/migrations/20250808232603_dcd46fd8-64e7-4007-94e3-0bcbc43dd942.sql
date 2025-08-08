-- Helper functions for security and org tree management
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = uid AND role = 'admin'::user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager_of(manager_uid uuid, employee_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH RECURSIVE org_tree AS (
    -- Start with the employee
    SELECT id, manager_id
    FROM public.users
    WHERE id = employee_uid
    
    UNION ALL
    
    -- Recursively find all managers up the chain
    SELECT u.id, u.manager_id
    FROM public.users u
    INNER JOIN org_tree ot ON u.id = ot.manager_id
  )
  SELECT EXISTS (
    SELECT 1 FROM org_tree WHERE id = manager_uid
  );
$$;

-- Materialized view for user course progress
CREATE MATERIALIZED VIEW public.mv_user_course_progress AS
SELECT 
  uce.user_id,
  uce.course_id,
  MIN(c.started_at) as first_started_at,
  MAX(GREATEST(c.started_at, c.completed_at)) as last_activity_at,
  MIN(CASE WHEN c.status IN ('completed', 'passed') THEN c.completed_at END) as first_completed_at,
  COUNT(c.id) as attempts,
  MAX(c.score_percentage) as best_score,
  AVG(c.score_percentage) as avg_score,
  COALESCE(SUM(c.time_spent_minutes), 0) as time_spent_minutes,
  COUNT(DISTINCT m.id) as modules_total,
  COUNT(DISTINCT CASE WHEN c.status IN ('completed', 'passed') THEN m.id END) as modules_passed,
  uce.progress_percentage as progress_pct
FROM public.user_course_enrollments uce
LEFT JOIN public.completions c ON c.user_id = uce.user_id AND c.course_id = uce.course_id
LEFT JOIN public.modules m ON m.course_id = uce.course_id AND m.is_required = true
GROUP BY uce.user_id, uce.course_id, uce.progress_percentage;

-- Materialized view for course metrics
CREATE MATERIALIZED VIEW public.mv_course_metrics AS
SELECT 
  c.id as course_id,
  COUNT(DISTINCT uce.user_id) as learners,
  COUNT(DISTINCT CASE WHEN uce.status = 'enrolled' THEN uce.user_id END) as in_progress,
  COUNT(DISTINCT CASE WHEN uce.status = 'completed' THEN uce.user_id END) as completed,
  CASE 
    WHEN COUNT(DISTINCT uce.user_id) > 0 
    THEN (COUNT(DISTINCT CASE WHEN uce.status = 'completed' THEN uce.user_id END)::numeric / COUNT(DISTINCT uce.user_id)::numeric) * 100
    ELSE 0 
  END as completion_rate,
  AVG(comp.score_percentage) as avg_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY comp.score_percentage) as median_score,
  AVG(comp.time_spent_minutes) as avg_time_minutes,
  COUNT(DISTINCT CASE 
    WHEN uce.status = 'completed' 
    AND uce.enrollment_date >= CURRENT_DATE - INTERVAL '30 days' 
    THEN uce.user_id 
  END) as completed_last_30d,
  COUNT(DISTINCT CASE 
    WHEN uce.enrollment_date >= CURRENT_DATE - INTERVAL '30 days' 
    THEN uce.user_id 
  END) as started_last_30d
FROM public.courses c
LEFT JOIN public.user_course_enrollments uce ON uce.course_id = c.id
LEFT JOIN public.completions comp ON comp.course_id = c.id AND comp.status IN ('completed', 'passed')
WHERE c.is_active = true
GROUP BY c.id;

-- View for module metrics
CREATE OR REPLACE VIEW public.v_module_metrics AS
SELECT 
  m.id as module_id,
  m.course_id,
  COUNT(c.id) as attempts,
  AVG(c.score_percentage) as avg_score,
  CASE 
    WHEN COUNT(c.id) > 0 
    THEN (COUNT(CASE WHEN c.status IN ('completed', 'passed') THEN 1 END)::numeric / COUNT(c.id)::numeric) * 100
    ELSE 0 
  END as pass_rate,
  AVG(c.time_spent_minutes) as avg_time_minutes,
  CASE 
    WHEN COUNT(DISTINCT uce.user_id) > 0 
    THEN ((COUNT(DISTINCT uce.user_id) - COUNT(DISTINCT c.user_id))::numeric / COUNT(DISTINCT uce.user_id)::numeric) * 100
    ELSE 0 
  END as dropoff_rate
FROM public.modules m
LEFT JOIN public.completions c ON c.module_id = m.id
LEFT JOIN public.user_course_enrollments uce ON uce.course_id = m.course_id
WHERE m.is_required = true
GROUP BY m.id, m.course_id;

-- View for learning patterns
CREATE OR REPLACE VIEW public.v_learning_patterns AS
SELECT 
  'hour' as bucket_type,
  EXTRACT(HOUR FROM started_at)::int as bucket,
  COUNT(*) as attempts,
  COUNT(CASE WHEN status IN ('completed', 'passed') THEN 1 END) as completions,
  AVG(time_spent_minutes) as avg_time_minutes
FROM public.completions
GROUP BY EXTRACT(HOUR FROM started_at)

UNION ALL

SELECT 
  'weekday' as bucket_type,
  EXTRACT(DOW FROM started_at)::int as bucket,
  COUNT(*) as attempts,
  COUNT(CASE WHEN status IN ('completed', 'passed') THEN 1 END) as completions,
  AVG(time_spent_minutes) as avg_time_minutes
FROM public.completions
GROUP BY EXTRACT(DOW FROM started_at);

-- View for skills gap analysis
CREATE OR REPLACE VIEW public.v_skills_gap AS
SELECT 
  u.id as user_id,
  c.id as course_id,
  c.is_mandatory as mandatory,
  uce.due_date,
  CASE 
    WHEN comp.status IN ('completed', 'passed') THEN 'ok'
    WHEN uce.due_date IS NOT NULL AND uce.due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'missing'
  END as status
FROM public.users u
CROSS JOIN public.courses c
LEFT JOIN public.user_course_enrollments uce ON uce.user_id = u.id AND uce.course_id = c.id
LEFT JOIN public.completions comp ON comp.user_id = u.id AND comp.course_id = c.id AND comp.status IN ('completed', 'passed')
WHERE c.is_mandatory = true 
  AND c.is_active = true
  AND u.is_active = true;

-- Materialized view for retention metrics
CREATE MATERIALIZED VIEW public.mv_retention_metrics AS
WITH weekly_cohorts AS (
  SELECT 
    DATE_TRUNC('week', uce.enrollment_date) as cohort_week,
    uce.user_id
  FROM public.user_course_enrollments uce
  WHERE uce.enrollment_date >= CURRENT_DATE - INTERVAL '1 year'
),
retention_data AS (
  SELECT 
    wc.cohort_week,
    wc.user_id,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.user_course_enrollments uce2 
        WHERE uce2.user_id = wc.user_id 
        AND uce2.enrollment_date BETWEEN wc.cohort_week + INTERVAL '30 days' AND wc.cohort_week + INTERVAL '60 days'
      ) OR EXISTS (
        SELECT 1 FROM public.completions c2 
        WHERE c2.user_id = wc.user_id 
        AND c2.started_at BETWEEN wc.cohort_week + INTERVAL '30 days' AND wc.cohort_week + INTERVAL '60 days'
      ) THEN 1 ELSE 0 
    END as retained_30d,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.user_course_enrollments uce2 
        WHERE uce2.user_id = wc.user_id 
        AND uce2.enrollment_date BETWEEN wc.cohort_week + INTERVAL '60 days' AND wc.cohort_week + INTERVAL '90 days'
      ) OR EXISTS (
        SELECT 1 FROM public.completions c2 
        WHERE c2.user_id = wc.user_id 
        AND c2.started_at BETWEEN wc.cohort_week + INTERVAL '60 days' AND wc.cohort_week + INTERVAL '90 days'
      ) THEN 1 ELSE 0 
    END as retained_60d,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.user_course_enrollments uce2 
        WHERE uce2.user_id = wc.user_id 
        AND uce2.enrollment_date BETWEEN wc.cohort_week + INTERVAL '90 days' AND wc.cohort_week + INTERVAL '120 days'
      ) OR EXISTS (
        SELECT 1 FROM public.completions c2 
        WHERE c2.user_id = wc.user_id 
        AND c2.started_at BETWEEN wc.cohort_week + INTERVAL '90 days' AND wc.cohort_week + INTERVAL '120 days'
      ) THEN 1 ELSE 0 
    END as retained_90d
  FROM weekly_cohorts wc
)
SELECT 
  cohort_week,
  COUNT(DISTINCT user_id) as users_started,
  SUM(retained_30d) as retained_30d,
  SUM(retained_60d) as retained_60d,
  SUM(retained_90d) as retained_90d
FROM retention_data
GROUP BY cohort_week
ORDER BY cohort_week;

-- Security definer RPCs for data access
CREATE OR REPLACE FUNCTION public.rpc_admin_team_user_progress(
  date_from date DEFAULT CURRENT_DATE - INTERVAL '90 days',
  date_to date DEFAULT CURRENT_DATE,
  manager_scope boolean DEFAULT true
)
RETURNS SETOF public.mv_user_course_progress
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM public.mv_user_course_progress
  WHERE (first_started_at >= date_from OR first_started_at IS NULL)
    AND (last_activity_at <= date_to OR last_activity_at IS NULL)
    AND (
      public.is_admin(auth.uid()) 
      OR (manager_scope AND public.is_manager_of(auth.uid(), user_id))
    );
$$;

CREATE OR REPLACE FUNCTION public.rpc_course_metrics(
  date_from date DEFAULT CURRENT_DATE - INTERVAL '90 days',
  date_to date DEFAULT CURRENT_DATE
)
RETURNS SETOF public.mv_course_metrics
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM public.mv_course_metrics
  WHERE public.is_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() AND u.role = 'manager'::user_role
    );
$$;

CREATE OR REPLACE FUNCTION public.rpc_module_metrics(
  course_id_param uuid DEFAULT NULL,
  date_from date DEFAULT CURRENT_DATE - INTERVAL '90 days',
  date_to date DEFAULT CURRENT_DATE
)
RETURNS SETOF public.v_module_metrics
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM public.v_module_metrics
  WHERE (course_id_param IS NULL OR course_id = course_id_param)
    AND (
      public.is_admin(auth.uid()) 
      OR EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'manager'::user_role
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.rpc_skills_gap(
  manager_scope boolean DEFAULT true
)
RETURNS SETOF public.v_skills_gap
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM public.v_skills_gap
  WHERE public.is_admin(auth.uid()) 
    OR (manager_scope AND public.is_manager_of(auth.uid(), user_id));
$$;

CREATE OR REPLACE FUNCTION public.rpc_learning_patterns(
  date_from date DEFAULT CURRENT_DATE - INTERVAL '90 days',
  date_to date DEFAULT CURRENT_DATE
)
RETURNS SETOF public.v_learning_patterns
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM public.v_learning_patterns
  WHERE public.is_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() AND u.role = 'manager'::user_role
    );
$$;

CREATE OR REPLACE FUNCTION public.rpc_retention_metrics()
RETURNS SETOF public.mv_retention_metrics
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM public.mv_retention_metrics
  WHERE public.is_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() AND u.role = 'manager'::user_role
    );
$$;

-- Refresh function for materialized views
CREATE OR REPLACE FUNCTION public.refresh_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only admins can refresh analytics
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only admins can refresh analytics';
  END IF;
  
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_course_progress;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_course_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_retention_metrics;
END;
$$;

-- Table for saved reports
CREATE TABLE public.analytics_saved_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  filters jsonb,
  columns jsonb,
  shared boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on saved reports
ALTER TABLE public.analytics_saved_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved reports
CREATE POLICY "Users can view their own reports and shared ones"
ON public.analytics_saved_reports
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR shared = true 
  OR public.is_admin(auth.uid())
  OR public.is_manager_of(auth.uid(), owner_id)
);

CREATE POLICY "Users can manage their own reports"
ON public.analytics_saved_reports
FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can manage all reports"
ON public.analytics_saved_reports
FOR ALL
USING (public.is_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_mv_user_course_progress_user_id ON public.mv_user_course_progress (user_id);
CREATE INDEX idx_mv_user_course_progress_course_id ON public.mv_user_course_progress (course_id);
CREATE INDEX idx_mv_user_course_progress_last_activity ON public.mv_user_course_progress (last_activity_at);

CREATE INDEX idx_mv_course_metrics_course_id ON public.mv_course_metrics (course_id);

CREATE INDEX idx_mv_retention_metrics_cohort_week ON public.mv_retention_metrics (cohort_week);

CREATE INDEX idx_analytics_saved_reports_owner_id ON public.analytics_saved_reports (owner_id);
CREATE INDEX idx_analytics_saved_reports_shared ON public.analytics_saved_reports (shared);

-- Create unique indexes for concurrent refresh
CREATE UNIQUE INDEX idx_mv_user_course_progress_unique ON public.mv_user_course_progress (user_id, course_id);
CREATE UNIQUE INDEX idx_mv_course_metrics_unique ON public.mv_course_metrics (course_id);
CREATE UNIQUE INDEX idx_mv_retention_metrics_unique ON public.mv_retention_metrics (cohort_week);

-- Schedule daily refresh at 2 AM
SELECT cron.schedule(
  'refresh-analytics-daily',
  '0 2 * * *',
  $$SELECT public.refresh_analytics();$$
);