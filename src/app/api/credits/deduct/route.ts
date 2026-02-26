import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const body = await request.json();
  const { feature_key, metadata = {} } = body;

  if (!feature_key) {
    return NextResponse.json({ error: 'feature_key is required' }, { status: 400 });
  }

  const auth = await requirePermission(supabase, 'create:scans');
  if (isAuthError(auth)) return auth;

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, credits, plan')
    .eq('id', auth.orgId)
    .single();

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  if (org.plan === 'enterprise') {
    return NextResponse.json({
      success: true,
      unlimited: true,
      message: 'Enterprise plan has unlimited credits'
    });
  }

  const { data: featureCost, error: costError } = await supabase
    .from('feature_credit_costs')
    .select('*')
    .eq('feature_key', feature_key)
    .eq('enabled', true)
    .maybeSingle();

  if (costError || !featureCost) {
    return NextResponse.json(
      { error: `Feature '${feature_key}' not found or disabled` },
      { status: 404 }
    );
  }

  const costAmount = featureCost.cost_credits;

  if (org.credits < costAmount) {
    return NextResponse.json({
      success: false,
      error: 'Insufficient credits',
      required: costAmount,
      available: org.credits,
      shortfall: costAmount - org.credits
    }, { status: 402 });
  }

  const { data: result, error: deductError } = await supabase.rpc('deduct_credits', {
    p_org_id: org.id,
    p_amount: costAmount,
    p_description: `Used feature: ${featureCost.description}`,
    p_metadata: {
      ...metadata,
      feature_key,
      user_id: auth.user.id,
      timestamp: new Date().toISOString()
    }
  });

  if (deductError || !result) {
    console.error('Credit deduction failed:', deductError);
    return NextResponse.json({
      success: false,
      error: 'Failed to deduct credits',
      details: deductError?.message
    }, { status: 500 });
  }

  const { data: updatedOrg } = await supabase
    .from('organizations')
    .select('credits')
    .eq('id', org.id)
    .single();

  return NextResponse.json({
    success: true,
    deducted: costAmount,
    balance_after: updatedOrg?.credits || 0,
    feature: featureCost.description
  });
}
