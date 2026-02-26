import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/permissions';

export async function GET() {
  const supabase = await createClient();

  const auth = await requirePermission(supabase, 'view:projects');
  if (isAuthError(auth)) return auth;

  const { data: costs, error: costsError } = await supabase
    .from('feature_credit_costs')
    .select('*')
    .eq('enabled', true)
    .order('cost_credits', { ascending: true });

  if (costsError) {
    return NextResponse.json({ error: costsError.message }, { status: 500 });
  }

  return NextResponse.json({ costs: costs || [] });
}
