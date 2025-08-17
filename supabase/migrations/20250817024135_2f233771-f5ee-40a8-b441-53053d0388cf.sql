-- Create a fortnightly (every 2 weeks) cron job for overdue notifications
-- Runs every other Monday at 9 AM (weeks 1, 3, 5, etc.)
SELECT cron.schedule(
  'overdue-notifications-fortnightly',
  '0 9 * * 1',
  $$
  SELECT
    CASE 
      WHEN extract('week' from now()) % 2 = 1 THEN
        net.http_post(
          url:='https://jjhwqwxmwygqoqsqrxnf.supabase.co/functions/v1/notifications-cron',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqaHdxd3htd3lncW9xc3FyeG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMTUxNDksImV4cCI6MjA2OTc5MTE0OX0.fiGMKgW391L_YAieqCphQZf9dFA9uBMXyoytsqFfW4Q"}'::jsonb,
          body:='{"scheduled": true}'::jsonb
        )
      ELSE null
    END as request_id;
  $$
);