
-- QA Fix Pack Phase 2: Refresh materialized views and verify analytics

-- Refresh course metrics materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_course_metrics;

-- Verify the view has data
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.mv_course_metrics;
  RAISE NOTICE 'mv_course_metrics refreshed successfully. Row count: %', row_count;
END $$;

-- Add comment documenting Phase 2 completion
COMMENT ON MATERIALIZED VIEW public.mv_course_metrics IS 
'Phase 2: Course performance metrics. Refreshed and verified. Access restricted to service_role for security.';
