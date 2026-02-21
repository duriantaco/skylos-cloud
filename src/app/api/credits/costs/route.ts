import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/credits/costs - Get all feature costs
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all enabled feature costs
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
