ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS slack_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS slack_notify_on TEXT DEFAULT 'failure';

COMMENT ON COLUMN projects.slack_webhook_url IS 'Slack Incoming Webhook URL';
COMMENT ON COLUMN projects.slack_notifications_enabled IS 'Whether Slack notifications are on';
COMMENT ON COLUMN projects.slack_notify_on IS 'When to notify: failure, always, recovery';