-- Remove the existing hourly cron job if it exists
SELECT cron.unschedule('overdue-notifications-hourly');

-- Create a fortnightly (every 2 weeks) cron job for overdue notifications
-- Runs every Monday at 9 AM, every 2 weeks
SELECT cron.schedule(
  'overdue-notifications-fortnightly',
  '0 9 * * 1/2',
  $$
  SELECT
    net.http_post(
        url:='https://jjhwqwxmwygqoqsqrxnf.supabase.co/functions/v1/notifications-cron',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqaHdxd3htd3lncW9xc3FyeG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NDE1MDAsImV4cCI6MjA1MDExNzUwMH0.qJv6dYqK9Hk5rXtO7GXFcK4rnLNMjdvr4A8o3rQ9kG8"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);