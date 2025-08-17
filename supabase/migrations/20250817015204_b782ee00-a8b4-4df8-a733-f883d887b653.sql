-- Fix Security Definer Views by recreating them without SECURITY DEFINER
-- This addresses the security linter warning about views with SECURITY DEFINER property

-- Drop existing views
DROP VIEW IF EXISTS public.v_learning_patterns;
DROP VIEW IF EXISTS public.v_module_metrics;
DROP VIEW IF EXISTS public.v_skills_gap;

-- Recreate v_learning_patterns without SECURITY DEFINER
CREATE VIEW public.v_learning_patterns AS
SELECT 
  'hour'::text AS bucket_type,
  EXTRACT(hour FROM completions.started_at)::integer AS bucket,
  COUNT(*) AS attempts,
  COUNT(CASE 
    WHEN completions.status::text = ANY (ARRAY['completed'::character varying::text, 'passed'::character varying::text]) 
    THEN 1 
    ELSE NULL::integer 
  END) AS completions,
  AVG(completions.time_spent_minutes) AS avg_time_minutes
FROM completions
GROUP BY EXTRACT(hour FROM completions.started_at)

UNION ALL

SELECT 
  'weekday'::text AS bucket_type,
  EXTRACT(dow FROM completions.started_at)::integer AS bucket,
  COUNT(*) AS attempts,
  COUNT(CASE 
    WHEN completions.status::text = ANY (ARRAY['completed'::character varying::text, 'passed'::character varying::text]) 
    THEN 1 
    ELSE NULL::integer 
  END) AS completions,
  AVG(completions.time_spent_minutes) AS avg_time_minutes
FROM completions
GROUP BY EXTRACT(dow FROM completions.started_at);

-- Recreate v_module_metrics without SECURITY DEFINER
CREATE VIEW public.v_module_metrics AS
SELECT 
  m.id AS module_id,
  m.course_id,
  COUNT(c.id) AS attempts,
  AVG(c.score_percentage) AS avg_score,
  CASE
    WHEN COUNT(c.id) > 0 THEN 
      (COUNT(CASE 
        WHEN c.status::text = ANY (ARRAY['completed'::character varying::text, 'passed'::character varying::text]) 
        THEN 1 
        ELSE NULL::integer 
      END)::numeric / COUNT(c.id)::numeric) * 100::numeric
    ELSE 0::numeric
  END AS pass_rate,
  AVG(c.time_spent_minutes) AS avg_time_minutes,
  CASE
    WHEN COUNT(DISTINCT uce.user_id) > 0 THEN 
      ((COUNT(DISTINCT uce.user_id) - COUNT(DISTINCT c.user_id))::numeric / COUNT(DISTINCT uce.user_id)::numeric) * 100::numeric
    ELSE 0::numeric
  END AS dropoff_rate
FROM modules m
LEFT JOIN completions c ON c.module_id = m.id
LEFT JOIN user_course_enrollments uce ON uce.course_id = m.course_id
WHERE m.is_required = true
GROUP BY m.id, m.course_id;

-- Recreate v_skills_gap without SECURITY DEFINER
CREATE VIEW public.v_skills_gap AS
SELECT 
  u.id AS user_id,
  c.id AS course_id,
  c.is_mandatory AS mandatory,
  uce.due_at AS due_date,
  CASE
    WHEN comp.status::text = ANY (ARRAY['completed'::character varying::text, 'passed'::character varying::text]) 
    THEN 'ok'::text
    WHEN uce.due_at IS NOT NULL AND uce.due_at < CURRENT_DATE 
    THEN 'overdue'::text
    ELSE 'missing'::text
  END AS status
FROM users u
CROSS JOIN courses c
LEFT JOIN user_course_enrollments uce ON uce.user_id = u.id AND uce.course_id = c.id
LEFT JOIN completions comp ON comp.user_id = u.id 
  AND comp.course_id = c.id 
  AND comp.status::text = ANY (ARRAY['completed'::character varying::text, 'passed'::character varying::text])
WHERE c.is_mandatory = true 
  AND c.is_active = true 
  AND u.is_active = true;

-- Add RLS policies for the views to ensure proper access control
-- Since these are views, RLS will be enforced based on the underlying table policies

-- Enable RLS on the views (views inherit RLS from their underlying tables by default)
-- No additional RLS policies needed as access control is handled by the underlying table policies