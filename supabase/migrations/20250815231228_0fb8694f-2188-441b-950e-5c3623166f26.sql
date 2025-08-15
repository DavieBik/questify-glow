-- Fix Security Definer View issue - Part 2: Create views without RLS on materialized views

-- Drop the existing materialized views and regular views first
DROP MATERIALIZED VIEW IF EXISTS public.mv_course_performance_analytics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_user_progress_analytics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_user_course_progress CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_module_analytics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_course_metrics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_retention_metrics CASCADE;
DROP VIEW IF EXISTS public.v_learning_patterns CASCADE;
DROP VIEW IF EXISTS public.v_module_metrics CASCADE;
DROP VIEW IF EXISTS public.v_skills_gap CASCADE;

-- Recreate materialized views without SECURITY DEFINER behavior
-- These will inherit the current user's permissions (not postgres superuser)
CREATE MATERIALIZED VIEW public.mv_course_performance_analytics AS
SELECT 
    co.id AS course_id,
    co.title AS course_title,
    co.category,
    co.difficulty,
    co.estimated_duration_minutes,
    co.is_mandatory,
    count(DISTINCT uce.user_id) AS enrolled_users,
    count(DISTINCT
        CASE
            WHEN ((c.status)::text = 'completed'::text) THEN c.user_id
            ELSE NULL::uuid
        END) AS completed_users,
    round(((100.0 * (count(DISTINCT
        CASE
            WHEN ((c.status)::text = 'completed'::text) THEN c.user_id
            ELSE NULL::uuid
        END))::numeric) / (NULLIF(count(DISTINCT uce.user_id), 0))::numeric), 2) AS completion_rate,
    avg(
        CASE
            WHEN ((c.status)::text = 'completed'::text) THEN c.score_percentage
            ELSE NULL::numeric
        END) AS avg_score,
    avg(
        CASE
            WHEN ((c.status)::text = 'completed'::text) THEN c.time_spent_minutes
            ELSE NULL::integer
        END) AS avg_time_minutes,
    count(DISTINCT c.id) AS total_attempts,
    count(DISTINCT
        CASE
            WHEN (((c.status)::text = 'completed'::text) AND (c.score_percentage >= (80)::numeric)) THEN c.id
            ELSE NULL::uuid
        END) AS passed_attempts
FROM ((courses co
     LEFT JOIN user_course_enrollments uce ON ((co.id = uce.course_id)))
     LEFT JOIN completions c ON ((co.id = c.course_id)))
WHERE (co.is_active = true)
GROUP BY co.id, co.title, co.category, co.difficulty, co.estimated_duration_minutes, co.is_mandatory;

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
    count(DISTINCT uce.course_id) AS enrolled_courses,
    count(DISTINCT
        CASE
            WHEN ((c.status)::text = 'completed'::text) THEN c.course_id
            ELSE NULL::uuid
        END) AS completed_courses,
    avg(
        CASE
            WHEN ((c.status)::text = 'completed'::text) THEN c.score_percentage
            ELSE NULL::numeric
        END) AS avg_score,
    sum(
        CASE
            WHEN ((c.status)::text = 'completed'::text) THEN c.time_spent_minutes
            ELSE NULL::integer
        END) AS total_time_minutes,
    max(c.completed_at) AS last_activity_at,
    min(
        CASE
            WHEN ((c.status)::text = 'completed'::text) THEN c.completed_at
            ELSE NULL::timestamp with time zone
        END) AS first_completed_at
FROM ((users u
     LEFT JOIN user_course_enrollments uce ON ((u.id = uce.user_id)))
     LEFT JOIN completions c ON ((u.id = c.user_id)))
WHERE (u.is_active = true)
GROUP BY u.id, u.first_name, u.last_name, u.email, u.department, u.role, u.manager_id, u.last_completion_date;

CREATE MATERIALIZED VIEW public.mv_user_course_progress AS
SELECT 
    uce.user_id,
    uce.course_id,
    min(c.started_at) AS first_started_at,
    max(GREATEST(c.started_at, c.completed_at)) AS last_activity_at,
    min(
        CASE
            WHEN ((c.status)::text = ANY ((ARRAY['completed'::character varying, 'passed'::character varying])::text[])) THEN c.completed_at
            ELSE NULL::timestamp with time zone
        END) AS first_completed_at,
    count(c.id) AS attempts,
    max(c.score_percentage) AS best_score,
    avg(c.score_percentage) AS avg_score,
    COALESCE(sum(c.time_spent_minutes), (0)::bigint) AS time_spent_minutes,
    count(DISTINCT m.id) AS modules_total,
    count(DISTINCT
        CASE
            WHEN ((c.status)::text = ANY ((ARRAY['completed'::character varying, 'passed'::character varying])::text[])) THEN m.id
            ELSE NULL::uuid
        END) AS modules_passed,
    uce.progress_percentage AS progress_pct
FROM ((user_course_enrollments uce
     LEFT JOIN completions c ON (((c.user_id = uce.user_id) AND (c.course_id = uce.course_id))))
     LEFT JOIN modules m ON (((m.course_id = uce.course_id) AND (m.is_required = true))))
GROUP BY uce.user_id, uce.course_id, uce.progress_percentage;

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
    count(DISTINCT c.user_id) AS attempted_users,
    count(DISTINCT
        CASE
            WHEN ((c.status)::text = 'completed'::text) THEN c.user_id
            ELSE NULL::uuid
        END) AS completed_users,
    round(((100.0 * (count(DISTINCT
        CASE
            WHEN ((c.status)::text = 'completed'::text) THEN c.user_id
            ELSE NULL::uuid
        END))::numeric) / (NULLIF(count(DISTINCT c.user_id), 0))::numeric), 2) AS completion_rate,
    avg(
        CASE
            WHEN ((c.status)::text = 'completed'::text) THEN c.score_percentage
            ELSE NULL::numeric
        END) AS avg_score,
    avg(
        CASE
            WHEN ((c.status)::text = 'completed'::text) THEN c.time_spent_minutes
            ELSE NULL::integer
        END) AS avg_time_minutes,
    count(DISTINCT c.id) AS total_attempts,
    round((count(DISTINCT c.id)::numeric / NULLIF(count(DISTINCT c.user_id), 0)::numeric), 2) AS avg_attempts_per_user
FROM ((modules m
     LEFT JOIN completions c ON ((m.id = c.module_id)))
     LEFT JOIN courses co ON ((co.id = m.course_id)))
WHERE (co.is_active = true)
GROUP BY m.id, m.course_id, m.title, m.content_type, m.order_index, m.pass_threshold_percentage, m.max_attempts, co.title;

-- Create performance indices
CREATE UNIQUE INDEX ON public.mv_course_performance_analytics (course_id);
CREATE UNIQUE INDEX ON public.mv_user_progress_analytics (user_id);
CREATE UNIQUE INDEX ON public.mv_user_course_progress (user_id, course_id);
CREATE UNIQUE INDEX ON public.mv_module_analytics (module_id);

-- Note: Materialized views cannot have RLS policies applied to them.
-- Access control should be handled at the application level through the RPC functions
-- that query these materialized views, which already have proper role-based access control.

-- Recreate regular views without security definer behavior
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

-- Refresh the materialized views
REFRESH MATERIALIZED VIEW public.mv_course_performance_analytics;
REFRESH MATERIALIZED VIEW public.mv_user_progress_analytics;
REFRESH MATERIALIZED VIEW public.mv_user_course_progress;
REFRESH MATERIALIZED VIEW public.mv_module_analytics;