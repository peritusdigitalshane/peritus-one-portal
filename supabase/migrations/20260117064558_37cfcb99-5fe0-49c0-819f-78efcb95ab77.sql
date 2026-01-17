-- Schedule SLA breach check to run every 15 minutes
SELECT
  cron.schedule(
    'sla-breach-check-every-15-min',
    '*/15 * * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://rrsrbmunjsinjuaewnmg.supabase.co/functions/v1/send-sla-breach-sms',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyc3JibXVuanNpbmp1YWV3bm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTA5NTMsImV4cCI6MjA2NTQ2Njk1M30.AxLiWfxF7vN1dMTwjhX_xmxzNHdZjCPUphCFQhPMqbI"}'::jsonb,
        body := '{}'::jsonb
      ) AS request_id;
    $$
  );