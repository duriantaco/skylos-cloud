import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
