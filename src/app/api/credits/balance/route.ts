import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .select(`
      org_id,
      organizations(
        id,
        name,
        credits,
        credits_updated_at,
        plan
      )
    `)
    .eq('user_id', user.id)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const org = member.organizations as any;

  // Get recent transactions (last 10)
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
