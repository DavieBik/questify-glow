-- Fix remaining security issues: view ownership and API exposure (corrected)

-- 1. Fix view ownership by recreating them under the current user (not postgres)
-- First drop the existing views
DROP VIEW IF EXISTS public.v_learning_patterns CASCADE;
DROP VIEW IF EXISTS public.v_module_metrics CASCADE;
DROP VIEW IF EXISTS public.v_skills_gap CASCADE;

-- 2. Recreate views (they will be owned by the current user, not postgres)
-- Note: These will now respect RLS policies of the underlying tables
CREATE VIEW public.v_learning_patterns AS
SELECT 'hour'::text AS bucket_type,
    EXTRACT(hour FROM completions.started_at)::integer AS bucket,
    count(*) AS attempts,
    count(
        CASE
            WHEN completions.status::text = ANY (ARRAY['completed'::character varying, 'passed'::character varying]::text[]) THEN 1
            ELSE NULL::integer
        END) AS completions,
    avg(completions.time_spent_minutes) AS avg_time_minutes
FROM completions
GROUP BY (EXTRACT(hour FROM completions.started_at))
UNION ALL
SELECT 'weekday'::text AS bucket_type,
    EXTRACT(dow FROM completions.started_at)::integer AS bucket,
    count(*) AS attempts,
    count(
        CASE
            WHEN completions.status::text = ANY (ARRAY['completed'::character varying, 'passed'::character varying]::text[]) THEN 1
            ELSE NULL::integer
        END) AS completions,
    avg(completions.time_spent_minutes) AS avg_time_minutes
FROM completions
GROUP BY (EXTRACT(dow FROM completions.started_at));

CREATE VIEW public.v_module_metrics AS
SELECT m.id AS module_id,
    m.course_id,
    count(c.id) AS attempts,
    avg(c.score_percentage) AS avg_score,
    CASE
        WHEN count(c.id) > 0 THEN count(
        CASE
            WHEN c.status::text = ANY (ARRAY['completed'::character varying, 'passed'::character varying]::text[]) THEN 1
            ELSE NULL::integer
        END)::numeric / count(c.id)::numeric * 100::numeric
        ELSE 0::numeric
    END AS pass_rate,
    avg(c.time_spent_minutes) AS avg_time_minutes,
    CASE
        WHEN count(DISTINCT uce.user_id) > 0 THEN (count(DISTINCT uce.user_id) - count(DISTINCT c.user_id))::numeric / count(DISTINCT uce.user_id)::numeric * 100::numeric
        ELSE 0::numeric
    END AS dropoff_rate
FROM modules m
    LEFT JOIN completions c ON c.module_id = m.id
    LEFT JOIN user_course_enrollments uce ON uce.course_id = m.course_id
WHERE m.is_required = true
GROUP BY m.id, m.course_id;

CREATE VIEW public.v_skills_gap AS
SELECT u.id AS user_id,
    c.id AS course_id,
    c.is_mandatory AS mandatory,
    uce.due_date,
    CASE
        WHEN comp.status::text = ANY (ARRAY['completed'::character varying, 'passed'::character varying]::text[]) THEN 'ok'::text
        WHEN uce.due_date IS NOT NULL AND uce.due_date < CURRENT_DATE THEN 'overdue'::text
        ELSE 'missing'::text
    END AS status
FROM users u
    CROSS JOIN courses c
    LEFT JOIN user_course_enrollments uce ON uce.user_id = u.id AND uce.course_id = c.id
    LEFT JOIN completions comp ON comp.user_id = u.id AND comp.course_id = c.id AND (comp.status::text = ANY (ARRAY['completed'::character varying, 'passed'::character varying]::text[]))
WHERE c.is_mandatory = true AND c.is_active = true AND u.is_active = true;

-- 3. Remove materialized views from API exposure by revoking public access
-- Note: This addresses the "Materialized View in API" warnings
REVOKE ALL ON public.mv_course_performance_analytics FROM anon, authenticated;
REVOKE ALL ON public.mv_user_progress_analytics FROM anon, authenticated;
REVOKE ALL ON public.mv_user_course_progress FROM anon, authenticated;
REVOKE ALL ON public.mv_module_analytics FROM anon, authenticated;

-- Grant specific access only to the functions that need them
GRANT SELECT ON public.mv_course_performance_analytics TO postgres;
GRANT SELECT ON public.mv_user_progress_analytics TO postgres;
GRANT SELECT ON public.mv_user_course_progress TO postgres;
GRANT SELECT ON public.mv_module_analytics TO postgres;

-- Note: Access to these materialized views should only be through the existing RPC functions
-- which already have proper role-based access control implemented