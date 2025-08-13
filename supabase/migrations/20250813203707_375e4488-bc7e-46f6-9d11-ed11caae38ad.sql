-- Fix Security Definer Views
-- Remove SECURITY DEFINER from materialized views to comply with security best practices

-- First, let's check and recreate the materialized views without SECURITY DEFINER

-- Drop and recreate mv_user_course_progress without SECURITY DEFINER
DROP MATERIALIZED VIEW IF EXISTS public.mv_user_course_progress;
CREATE MATERIALIZED VIEW public.mv_user_course_progress AS
SELECT 
  uce.user_id,
  uce.course_id,
  MIN(c.started_at) AS first_started_at,
  MAX(GREATEST(c.started_at, c.completed_at)) AS last_activity_at,
  MIN(CASE WHEN c.status IN ('completed', 'passed') THEN c.completed_at END) AS first_completed_at,
  COUNT(c.id) AS attempts,
  MAX(c.score_percentage) AS best_score,
  AVG(c.score_percentage) AS avg_score,
  COALESCE(SUM(c.time_spent_minutes), 0) AS time_spent_minutes,
  COUNT(DISTINCT m.id) AS modules_total,
  COUNT(DISTINCT CASE WHEN c.status IN ('completed', 'passed') THEN m.id END) AS modules_passed,
  uce.progress_percentage AS progress_pct
FROM user_course_enrollments uce
LEFT JOIN completions c ON c.user_id = uce.user_id AND c.course_id = uce.course_id
LEFT JOIN modules m ON m.course_id = uce.course_id AND m.is_required = true
GROUP BY uce.user_id, uce.course_id, uce.progress_percentage;

-- Create unique index for concurrency
CREATE UNIQUE INDEX CONCURRENTLY idx_mv_user_course_progress_unique 
ON public.mv_user_course_progress (user_id, course_id);

-- Drop and recreate mv_course_metrics without SECURITY DEFINER
DROP MATERIALIZED VIEW IF EXISTS public.mv_course_metrics;
CREATE MATERIALIZED VIEW public.mv_course_metrics AS
SELECT 
  c.id AS course_id,
  COUNT(DISTINCT uce.user_id) AS learners,
  COUNT(DISTINCT CASE WHEN uce.status = 'enrolled' THEN uce.user_id END) AS in_progress,
  COUNT(DISTINCT CASE WHEN uce.status = 'completed' THEN uce.user_id END) AS completed,
  CASE 
    WHEN COUNT(DISTINCT uce.user_id) > 0 
    THEN (COUNT(DISTINCT CASE WHEN uce.status = 'completed' THEN uce.user_id END)::numeric / COUNT(DISTINCT uce.user_id)::numeric) * 100 
    ELSE 0 
  END AS completion_rate,
  AVG(comp.score_percentage) AS avg_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY comp.score_percentage) AS median_score
FROM courses c
LEFT JOIN user_course_enrollments uce ON c.id = uce.course_id
LEFT JOIN completions comp ON c.id = comp.course_id AND comp.status = 'completed'
WHERE c.is_active = true
GROUP BY c.id;

-- Create unique index for concurrency
CREATE UNIQUE INDEX CONCURRENTLY idx_mv_course_metrics_unique 
ON public.mv_course_metrics (course_id);

-- Drop and recreate mv_retention_metrics without SECURITY DEFINER
DROP MATERIALIZED VIEW IF EXISTS public.mv_retention_metrics;
CREATE MATERIALIZED VIEW public.mv_retention_metrics AS
SELECT 
  DATE_TRUNC('week', uce.enrolled_at) AS week_start,
  COUNT(DISTINCT uce.user_id) AS new_enrollments,
  COUNT(DISTINCT CASE WHEN comp.completed_at IS NOT NULL THEN uce.user_id END) AS completions,
  CASE 
    WHEN COUNT(DISTINCT uce.user_id) > 0 
    THEN (COUNT(DISTINCT CASE WHEN comp.completed_at IS NOT NULL THEN uce.user_id END)::numeric / COUNT(DISTINCT uce.user_id)::numeric) * 100 
    ELSE 0 
  END AS retention_rate
FROM user_course_enrollments uce
LEFT JOIN completions comp ON uce.user_id = comp.user_id AND uce.course_id = comp.course_id
WHERE uce.enrolled_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', uce.enrolled_at)
ORDER BY week_start;

-- Create unique index for concurrency
CREATE UNIQUE INDEX CONCURRENTLY idx_mv_retention_metrics_unique 
ON public.mv_retention_metrics (week_start);