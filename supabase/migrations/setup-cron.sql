-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO supabase_admin;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO supabase_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA cron TO supabase_admin;

-- Drop existing job if any
SELECT cron.unschedule('ai-queue-processor');

-- Schedule job to run every 30 seconds
SELECT cron.schedule(
  'ai-queue-processor',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://liqutcjzzrqstivvfele.supabase.co/functions/v1/process-ai-queue',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer [YOUR_SERVICE_KEY]"}',
    body:='{"limit": 1}'
  );
  $$
);

-- Verify job created
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'ai-queue-processor';