-- Fix Security Definer issues with materialized views
-- Drop and recreate materialized views without any SECURITY DEFINER properties

-- Drop existing materialized views
DROP MATERIALIZED VIEW IF EXISTS public.mv_course_performance_analytics;
DROP MATERIALIZED VIEW IF EXISTS public.mv_module_analytics;
DROP MATERIALIZED VIEW IF EXISTS public.mv_user_course_progress;
DROP MATERIALIZED VIEW IF EXISTS public.mv_user_progress_analytics;

-- Recreate mv_user_course_progress
CREATE MATERIALIZED VIEW public.mv_user_course_progress AS
SELECT 
  uce.user_id,
  uce.course_id,
  MIN(c.started_at) AS first_started_at,
  MAX(GREATEST(c.started_at, c.completed_at)) AS last_activity_at,
  MIN(CASE 
    WHEN c.status IN ('completed', 'passed') 
    THEN c.completed_at 
    ELSE NULL 
  END) AS first_completed_at,
  COUNT(c.id) AS attempts,
  MAX(c.score_percentage) AS best_score,
  AVG(c.score_percentage) AS avg_score,
  COALESCE(SUM(c.time_spent_minutes), 0) AS time_spent_minutes,
  COUNT(DISTINCT m.id) AS modules_total,
  COUNT(DISTINCT CASE 
    WHEN c.status IN ('completed', 'passed') 
    THEN m.id 
    ELSE NULL 
  END) AS modules_passed,
  uce.progress_percentage AS progress_pct
FROM user_course_enrollments uce
LEFT JOIN completions c ON c.user_id = uce.user_id AND c.course_id = uce.course_id
LEFT JOIN modules m ON m.course_id = uce.course_id AND m.is_required = true
GROUP BY uce.user_id, uce.course_id, uce.progress_percentage;

-- Recreate mv_course_performance_analytics
CREATE MATERIALIZED VIEW public.mv_course_performance_analytics AS
SELECT 
  co.id AS course_id,
  co.title AS course_title,
  co.category,
  co.difficulty,
  co.estimated_duration_minutes,
  co.is_mandatory,
  COUNT(DISTINCT uce.user_id) AS enrolled_users,
  COUNT(DISTINCT CASE 
    WHEN c.status = 'completed' 
    THEN c.user_id 
    ELSE NULL 
  END) AS completed_users,
  ROUND(
    (100.0 * COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.user_id ELSE NULL END)::numeric) / 
    NULLIF(COUNT(DISTINCT uce.user_id), 0)::numeric, 
    2
  ) AS completion_rate,
  AVG(CASE 
    WHEN c.status = 'completed' 
    THEN c.score_percentage 
    ELSE NULL 
  END) AS avg_score,
  AVG(CASE 
    WHEN c.status = 'completed' 
    THEN c.time_spent_minutes 
    ELSE NULL 
  END) AS avg_time_minutes,
  COUNT(DISTINCT c.id) AS total_attempts,
  COUNT(DISTINCT CASE 
    WHEN c.status = 'completed' AND c.score_percentage >= 80 
    THEN c.id 
    ELSE NULL 
  END) AS passed_attempts
FROM courses co
LEFT JOIN user_course_enrollments uce ON co.id = uce.course_id
LEFT JOIN completions c ON co.id = c.course_id
WHERE co.is_active = true
GROUP BY co.id, co.title, co.category, co.difficulty, co.estimated_duration_minutes, co.is_mandatory;

-- Recreate mv_module_analytics
CREATE MATERIALIZED VIEW public.mv_module_analytics AS
SELECT 
  m.id AS module_id,
  m.course_id,
  m.title AS module_title,
  m.content_type,
  m.order_index,
  m.pass_threshold_percentage,
  m.max_attempts,
  co.title AS course_title,
  COUNT(DISTINCT c.user_id) AS attempted_users,
  COUNT(DISTINCT CASE 
    WHEN c.status = 'completed' 
    THEN c.user_id 
    ELSE NULL 
  END) AS completed_users,
  ROUND(
    (100.0 * COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.user_id ELSE NULL END)::numeric) / 
    NULLIF(COUNT(DISTINCT c.user_id), 0)::numeric, 
    2
  ) AS completion_rate,
  AVG(CASE 
    WHEN c.status = 'completed' 
    THEN c.score_percentage 
    ELSE NULL 
  END) AS avg_score,
  AVG(CASE 
    WHEN c.status = 'completed' 
    THEN c.time_spent_minutes 
    ELSE NULL 
  END) AS avg_time_minutes,
  COUNT(DISTINCT c.id) AS total_attempts,
  ROUND(
    COUNT(DISTINCT c.id)::numeric / NULLIF(COUNT(DISTINCT c.user_id), 0)::numeric, 
    2
  ) AS avg_attempts_per_user
FROM modules m
LEFT JOIN completions c ON m.id = c.module_id
LEFT JOIN courses co ON co.id = m.course_id
WHERE co.is_active = true
GROUP BY m.id, m.course_id, m.title, m.content_type, m.order_index, m.pass_threshold_percentage, m.max_attempts, co.title;

-- Recreate mv_user_progress_analytics
CREATE MATERIALIZED VIEW public.mv_user_progress_analytics AS
SELECT 
  u.id AS user_id,
  u.first_name,
  u.last_name,
  u.email,
  u.department,
  u.role,
  u.manager_id,
  u.last_completion_date,
  COUNT(DISTINCT uce.course_id) AS enrolled_courses,
  COUNT(DISTINCT CASE 
    WHEN c.status = 'completed' 
    THEN c.course_id 
    ELSE NULL 
  END) AS completed_courses,
  AVG(CASE 
    WHEN c.status = 'completed' 
    THEN c.score_percentage 
    ELSE NULL 
  END) AS avg_score,
  SUM(CASE 
    WHEN c.status = 'completed' 
    THEN c.time_spent_minutes 
    ELSE NULL 
  END) AS total_learning_time_minutes,
  MAX(c.completed_at) AS last_completed_at,
  COUNT(DISTINCT CASE 
    WHEN c.completed_at > CURRENT_DATE - INTERVAL '30 days' 
    THEN c.id 
    ELSE NULL 
  END) AS completions_last_30d
FROM users u
LEFT JOIN user_course_enrollments uce ON u.id = uce.user_id
LEFT JOIN completions c ON u.id = c.user_id
WHERE u.is_active = true
GROUP BY u.id, u.first_name, u.last_name, u.email, u.department, u.role, u.manager_id, u.last_completion_date;

-- Create unique indexes for concurrent refresh
CREATE UNIQUE INDEX ix_mv_user_course_progress_unique 
ON public.mv_user_course_progress (user_id, course_id);

CREATE UNIQUE INDEX ix_mv_course_performance_analytics_unique 
ON public.mv_course_performance_analytics (course_id);

CREATE UNIQUE INDEX ix_mv_module_analytics_unique 
ON public.mv_module_analytics (module_id);

CREATE UNIQUE INDEX ix_mv_user_progress_analytics_unique 
ON public.mv_user_progress_analytics (user_id);