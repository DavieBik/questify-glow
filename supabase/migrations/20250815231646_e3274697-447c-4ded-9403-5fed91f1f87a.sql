-- Final fix for Security Definer View issue - Transfer ownership

-- Transfer ownership of all views from postgres to the authenticator role
-- This ensures they don't behave as security definer views
ALTER VIEW public.v_learning_patterns OWNER TO authenticator;
ALTER VIEW public.v_module_metrics OWNER TO authenticator;
ALTER VIEW public.v_skills_gap OWNER TO authenticator;

-- Also transfer ownership of materialized views to be consistent
ALTER MATERIALIZED VIEW public.mv_course_performance_analytics OWNER TO authenticator;
ALTER MATERIALIZED VIEW public.mv_user_progress_analytics OWNER TO authenticator;
ALTER MATERIALIZED VIEW public.mv_user_course_progress OWNER TO authenticator;
ALTER MATERIALIZED VIEW public.mv_module_analytics OWNER TO authenticator;

-- Grant necessary permissions to authenticated users for regular views
-- (since they will now respect the user's permissions)
GRANT SELECT ON public.v_learning_patterns TO authenticated;
GRANT SELECT ON public.v_module_metrics TO authenticated;  
GRANT SELECT ON public.v_skills_gap TO authenticated;

-- Keep materialized views access restricted (only through RPC functions)
-- No additional grants needed for materialized views since they should only be accessed through RPC functions