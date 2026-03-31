CREATE TABLE IF NOT EXISTS billing_reconciliation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'lemon_squeezy',
  event_name TEXT NOT NULL,
  status TEXT NOT NULL,
  order_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS billing_reconciliation_events_created_at_idx
  ON billing_reconciliation_events (created_at DESC);

CREATE INDEX IF NOT EXISTS billing_reconciliation_events_order_id_idx
  ON billing_reconciliation_events (order_id)
  WHERE order_id IS NOT NULL;

ALTER TABLE billing_reconciliation_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE billing_reconciliation_events TO service_role;
