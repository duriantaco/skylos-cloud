ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS discord_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discord_notify_on TEXT DEFAULT 'failure';

COMMENT ON COLUMN projects.discord_webhook_url IS 'Discord Webhook URL';
COMMENT ON COLUMN projects.discord_notifications_enabled IS 'Whether to send Discord notifications';
COMMENT ON COLUMN projects.discord_notify_on IS 'When to notify: failure, always, or recovery';
