WITH ranked_credit_purchases AS (
  SELECT
    id,
    ls_order_id,
    row_number() OVER (
      PARTITION BY ls_order_id
      ORDER BY
        CASE status
          WHEN 'completed' THEN 0
          WHEN 'processing' THEN 1
          WHEN 'refunded' THEN 2
          ELSE 3
        END,
        created_at ASC,
        id ASC
    ) AS row_num
  FROM credit_purchases
  WHERE ls_order_id IS NOT NULL
)
UPDATE credit_purchases AS cp
SET
  metadata = COALESCE(cp.metadata, '{}'::jsonb) || jsonb_build_object(
    'deduped_at',
    now(),
    'original_ls_order_id',
    cp.ls_order_id
  ),
  ls_order_id = NULL,
  status = CASE
    WHEN cp.status = 'completed' THEN 'duplicate'
    ELSE cp.status
  END
FROM ranked_credit_purchases AS ranked
WHERE cp.id = ranked.id
  AND ranked.row_num > 1;

DROP INDEX IF EXISTS idx_credit_purchases_ls_order;

CREATE UNIQUE INDEX IF NOT EXISTS credit_purchases_ls_order_unique
  ON credit_purchases (ls_order_id);

DROP FUNCTION IF EXISTS fulfill_credit_purchase(UUID, TEXT, INTEGER, INTEGER, TEXT, UUID);

CREATE OR REPLACE FUNCTION fulfill_credit_purchase(
  p_org_id UUID,
  p_pack_id TEXT,
  p_credits INTEGER,
  p_amount_cents INTEGER,
  p_order_id TEXT,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_existing_status TEXT;
  v_current_plan TEXT;
  v_current_expiry TIMESTAMPTZ;
  v_new_expiry TIMESTAMPTZ;
  v_pro_days INTEGER;
  v_added BOOLEAN;
BEGIN
  IF p_order_id IS NULL OR btrim(p_order_id) = '' THEN
    RAISE EXCEPTION 'p_order_id is required';
  END IF;

  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'p_credits must be positive';
  END IF;

  INSERT INTO credit_purchases (
    org_id,
    credits,
    amount_cents,
    pack_name,
    ls_order_id,
    status,
    created_by
  ) VALUES (
    p_org_id,
    p_credits,
    p_amount_cents,
    p_pack_id,
    p_order_id,
    'processing',
    p_user_id
  )
  ON CONFLICT (ls_order_id) DO NOTHING;

  SELECT status
  INTO v_existing_status
  FROM credit_purchases
  WHERE ls_order_id = p_order_id
  FOR UPDATE;

  IF v_existing_status IN ('completed', 'refunded') THEN
    RETURN TRUE;
  END IF;

  UPDATE credit_purchases
  SET
    org_id = p_org_id,
    credits = p_credits,
    amount_cents = p_amount_cents,
    pack_name = p_pack_id,
    status = 'processing',
    created_by = COALESCE(created_by, p_user_id),
    metadata = (COALESCE(metadata, '{}'::jsonb) - 'last_error' - 'failed_at')
  WHERE ls_order_id = p_order_id;

  BEGIN
    SELECT add_credits(
      p_org_id,
      p_credits,
      'purchase',
      format('Purchased %s credits (%s pack)', p_credits, p_pack_id),
      jsonb_build_object(
        'pack_id',
        p_pack_id,
        'ls_order_id',
        p_order_id
      ),
      p_user_id
    )
    INTO v_added;

    IF v_added IS NOT TRUE THEN
      RAISE EXCEPTION 'Failed to add credits';
    END IF;

    SELECT plan, pro_expires_at
    INTO v_current_plan, v_current_expiry
    FROM organizations
    WHERE id = p_org_id
    FOR UPDATE;

    IF v_current_plan IS DISTINCT FROM 'enterprise' THEN
      v_pro_days := CASE p_pack_id
        WHEN 'starter' THEN 30
        WHEN 'builder' THEN 90
        WHEN 'team' THEN 180
        WHEN 'scale' THEN 365
        ELSE 30
      END;

      v_new_expiry := (
        CASE
          WHEN v_current_expiry IS NOT NULL AND v_current_expiry > now()
            THEN v_current_expiry
          ELSE now()
        END
      ) + make_interval(days => v_pro_days);

      UPDATE organizations
      SET
        plan = 'pro',
        pro_expires_at = v_new_expiry
      WHERE id = p_org_id;
    END IF;

    UPDATE credit_purchases
    SET
      status = 'completed',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'completed_at',
        now()
      )
    WHERE ls_order_id = p_order_id;

    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      UPDATE credit_purchases
      SET
        status = 'failed',
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'last_error',
          SQLERRM,
          'failed_at',
          now()
        )
      WHERE ls_order_id = p_order_id;

      RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS refund_credit_purchase(TEXT);

CREATE OR REPLACE FUNCTION refund_credit_purchase(
  p_order_id TEXT
) RETURNS TEXT AS $$
DECLARE
  v_purchase RECORD;
  v_deducted BOOLEAN;
BEGIN
  IF p_order_id IS NULL OR btrim(p_order_id) = '' THEN
    RAISE EXCEPTION 'p_order_id is required';
  END IF;

  SELECT
    id,
    org_id,
    credits,
    pack_name,
    created_by,
    status
  INTO v_purchase
  FROM credit_purchases
  WHERE ls_order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF v_purchase.status = 'refunded' THEN
    RETURN 'already_refunded';
  END IF;

  IF v_purchase.status <> 'completed' THEN
    RETURN 'invalid_status';
  END IF;

  SELECT deduct_credits(
    v_purchase.org_id,
    v_purchase.credits,
    format('Refunded %s credits (%s pack)', v_purchase.credits, v_purchase.pack_name),
    jsonb_build_object(
      'ls_order_id',
      p_order_id
    )
  )
  INTO v_deducted;

  IF v_deducted IS NOT TRUE THEN
    UPDATE credit_purchases
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_refund_error',
      'Failed to deduct credits',
      'last_refund_error_at',
      now()
    )
    WHERE id = v_purchase.id;

    RETURN 'error';
  END IF;

  UPDATE credit_purchases
  SET
    status = 'refunded',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'refunded_at',
      now()
    )
  WHERE id = v_purchase.id;

  RETURN 'refunded';
EXCEPTION
  WHEN OTHERS THEN
    UPDATE credit_purchases
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_refund_error',
      SQLERRM,
      'last_refund_error_at',
      now()
    )
    WHERE ls_order_id = p_order_id;

    RETURN 'error';
END;
$$ LANGUAGE plpgsql;

GRANT ALL ON FUNCTION fulfill_credit_purchase(UUID, TEXT, INTEGER, INTEGER, TEXT, UUID) TO service_role;
GRANT ALL ON FUNCTION refund_credit_purchase(TEXT) TO service_role;
