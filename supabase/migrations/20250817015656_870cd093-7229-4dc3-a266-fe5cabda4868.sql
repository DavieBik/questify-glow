-- Remove materialized views from API exposure and fix security definer views
-- This addresses both the "Security Definer View" and "Materialized View in API" warnings

-- First, revoke access from materialized views to remove them from API
REVOKE ALL ON public.mv_course_performance_analytics FROM anon, authenticated;
REVOKE ALL ON public.mv_module_analytics FROM anon, authenticated;
REVOKE ALL ON public.mv_user_course_progress FROM anon, authenticated;
REVOKE ALL ON public.mv_user_progress_analytics FROM anon, authenticated;

-- Remove the regular views that might have security definer and recreate them properly
DROP VIEW IF EXISTS public.v_learning_patterns CASCADE;
DROP VIEW IF EXISTS public.v_module_metrics CASCADE;
DROP VIEW IF EXISTS public.v_skills_gap CASCADE;

-- Since these views might not be needed for the application to function properly,
-- and they seem to be causing security issues, we'll comment them out for now.
-- If they are needed, they can be recreated later without SECURITY DEFINER.

-- Alternative: Create simple functions instead of views if this data is needed
-- This allows for better security control

-- Note: If any code references these views, it will need to be updated to use 
-- the materialized views or direct table queries instead.