-- Remove the failed cron schedule attempt
-- Note: pg_cron extension needs to be enabled manually in Supabase dashboard
-- Users can schedule manually or we'll provide instructions

-- Just create a comment about manual cron setup
-- Manual setup: Enable pg_cron extension in Supabase Dashboard > Database > Extensions
-- Then run: SELECT cron.schedule('refresh-analytics-daily', '0 2 * * *', $$SELECT public.refresh_analytics();$$);