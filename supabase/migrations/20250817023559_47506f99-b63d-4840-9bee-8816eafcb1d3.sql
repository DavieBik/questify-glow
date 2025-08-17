-- Create a cron job to run notifications every hour
SELECT cron.schedule(
  'overdue-notifications-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://jjhwqwxmwygqoqsqrxnf.supabase.co/functions/v1/notifications-cron',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqaHdxd3htd3lncW9xc3FyeG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMTUxNDksImV4cCI6MjA2OTc5MTE0OX0.fiGMKgW391L_YAieqCphQZf9dFA9uBMXyoytsqFfW4Q"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);