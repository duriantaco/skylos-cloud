-- Permanent workspace access after purchase; timed `pro_expires_at` remains trial-only.

UPDATE organizations AS org
SET
  plan = 'pro',
  pro_expires_at = NULL
WHERE org.plan <> 'enterprise'
  AND EXISTS (
    SELECT 1
    FROM credit_purchases AS cp
    WHERE cp.org_id = org.id
      AND cp.status = 'completed'
  );

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

  SELECT plan, pro_expires_at
  INTO v_current_plan, v_current_expiry
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;

  UPDATE credit_purchases
  SET
    org_id = p_org_id,
    credits = p_credits,
    amount_cents = p_amount_cents,
    pack_name = p_pack_id,
    status = 'processing',
    created_by = COALESCE(created_by, p_user_id),
    metadata = (
      (COALESCE(metadata, '{}'::jsonb) - 'last_error' - 'failed_at') ||
      jsonb_build_object(
        'previous_plan',
        v_current_plan,
        'previous_pro_expires_at',
        v_current_expiry
      )
    )
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

    IF v_current_plan IS DISTINCT FROM 'enterprise' THEN
      UPDATE organizations
      SET
        plan = 'pro',
        pro_expires_at = NULL
      WHERE id = p_org_id;
    END IF;

    UPDATE credit_purchases
    SET
      status = 'completed',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'completed_at',
        now(),
        'workspace_access_granted_at',
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
  v_remaining_paid_access BOOLEAN;
  v_previous_plan TEXT;
  v_previous_expiry TIMESTAMPTZ;
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
    status,
    metadata
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

  SELECT EXISTS (
    SELECT 1
    FROM credit_purchases AS cp
    WHERE cp.org_id = v_purchase.org_id
      AND cp.status = 'completed'
  )
  INTO v_remaining_paid_access;

  SELECT
    NULLIF(v_purchase.metadata->>'previous_plan', ''),
    CASE
      WHEN NULLIF(v_purchase.metadata->>'previous_pro_expires_at', '') IS NULL
        THEN NULL
      ELSE (v_purchase.metadata->>'previous_pro_expires_at')::timestamptz
    END
  INTO v_previous_plan, v_previous_expiry;

  UPDATE organizations
  SET
    plan = CASE
      WHEN plan = 'enterprise' THEN 'enterprise'
      WHEN v_remaining_paid_access THEN 'pro'
      WHEN v_previous_plan IN ('free', 'pro') THEN v_previous_plan
      ELSE 'free'
    END,
    pro_expires_at = CASE
      WHEN plan = 'enterprise' THEN pro_expires_at
      WHEN v_remaining_paid_access THEN NULL
      ELSE v_previous_expiry
    END
  WHERE id = v_purchase.org_id;

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
