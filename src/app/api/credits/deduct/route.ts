import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { feature_key, metadata = {} } = body;

  if (!feature_key) {
    return NextResponse.json({ error: 'feature_key is required' }, { status: 400 });
  }

  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .select('org_id, organizations(id, name, credits, plan)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const org = member.organizations as any;
  const orgId = org.id;

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
    }, { status: 402 }); // 402 Payment Required
  }

  const { data: result, error: deductError } = await supabase.rpc('deduct_credits', {
    p_org_id: orgId,
    p_amount: costAmount,
    p_description: `Used feature: ${featureCost.description}`,
    p_metadata: {
      ...metadata,
      feature_key,
      user_id: user.id,
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
    .eq('id', orgId)
    .single();

  return NextResponse.json({
    success: true,
    deducted: costAmount,
    balance_after: updatedOrg?.credits || 0,
    feature: featureCost.description
  });
}
