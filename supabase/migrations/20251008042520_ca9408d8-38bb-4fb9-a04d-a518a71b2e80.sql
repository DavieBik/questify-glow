-- Fix Phase 1 Security: Restrict materialized view API access
-- The mv_course_metrics view should only be accessible via RPC functions, not directly

-- Revoke direct access from anon and authenticated roles
REVOKE ALL ON public.mv_course_metrics FROM anon;
REVOKE ALL ON public.mv_course_metrics FROM authenticated;

-- Grant SELECT only to service_role (for admin operations)
GRANT SELECT ON public.mv_course_metrics TO service_role;

COMMENT ON MATERIALIZED VIEW public.mv_course_metrics IS 
'Phase 1: Course metrics materialized view. Access restricted to RPC functions only. Direct API access revoked for security.';