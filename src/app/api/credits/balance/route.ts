import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/permissions';

export async function GET() {
  const supabase = await createClient();

  const auth = await requirePermission(supabase, 'view:projects');
  if (isAuthError(auth)) return auth;

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, credits, credits_updated_at, plan')
    .eq('id', auth.orgId)
    .single();

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const { data: transactions, error: txError } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (txError) {
    console.error('Error fetching transactions:', txError);
  }

  return NextResponse.json({
    balance: org.credits || 0,
    org_id: org.id,
    org_name: org.name,
    plan: org.plan || 'free',
    last_updated: org.credits_updated_at,
    recent_transactions: transactions || []
  });
}
