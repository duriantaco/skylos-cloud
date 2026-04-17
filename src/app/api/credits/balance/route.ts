import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/permissions';
import { getEffectivePlan } from '@/lib/entitlements';
import { resolveProjectFromToken } from '@/lib/project-api-keys';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key);
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  // API key auth (CLI)
  if (token?.startsWith('sk_live_')) {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const resolved = await resolveProjectFromToken<{
      org_id: string;
      organizations: {
        id: string;
        name: string;
        credits: number | null;
        credits_updated_at: string | null;
        plan: string | null;
        pro_expires_at: string | null;
      } | {
        id: string;
        name: string;
        credits: number | null;
        credits_updated_at: string | null;
        plan: string | null;
        pro_expires_at: string | null;
      }[] | null;
    }>(
      admin,
      token,
      'org_id, organizations(id, name, credits, credits_updated_at, plan, pro_expires_at)'
    );

    const project = resolved?.project;

    if (!project) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const org = Array.isArray(project.organizations)
      ? project.organizations[0]
      : project.organizations;

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const effectivePlan = getEffectivePlan({ plan: org.plan || 'free', pro_expires_at: org.pro_expires_at });

    const [{ data: transactions }, { count: completedPurchases }] = await Promise.all([
      admin
        .from('credit_transactions')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
        .limit(10),
      admin
        .from('credit_purchases')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('status', 'completed'),
    ]);

    return NextResponse.json({
      balance: org.credits || 0,
      org_id: org.id,
      org_name: org.name,
      plan: effectivePlan,
      pro_expires_at: org.pro_expires_at || null,
      has_completed_purchase: Boolean((completedPurchases || 0) > 0),
      last_updated: org.credits_updated_at,
      recent_transactions: transactions || [],
    });
  }

  // Session auth (dashboard)
  const supabase = await createClient();

  const auth = await requirePermission(supabase, 'view:projects');
  if (isAuthError(auth)) return auth;

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, credits, credits_updated_at, plan, pro_expires_at')
    .eq('id', auth.orgId)
    .single();

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const effectivePlan = getEffectivePlan({ plan: org.plan || 'free', pro_expires_at: org.pro_expires_at });

  const [{ data: transactions, error: txError }, { count: completedPurchases, error: purchaseError }] =
    await Promise.all([
      supabase
        .from('credit_transactions')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('credit_purchases')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('status', 'completed'),
    ]);

  if (txError) {
    console.error('Error fetching transactions:', txError);
  }
  if (purchaseError) {
    console.error('Error fetching completed purchases:', purchaseError);
  }

  return NextResponse.json({
    balance: org.credits || 0,
    org_id: org.id,
    org_name: org.name,
    plan: effectivePlan,
    pro_expires_at: org.pro_expires_at || null,
    has_completed_purchase: Boolean((completedPurchases || 0) > 0),
    last_updated: org.credits_updated_at,
    recent_transactions: transactions || []
  });
}
