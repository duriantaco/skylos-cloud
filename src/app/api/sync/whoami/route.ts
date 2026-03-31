import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { hashApiKey } from "@/lib/api-key";
import { getEffectivePlan } from "@/lib/entitlements";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return null
  }
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Server misconfigured', code: 'SERVER_MISCONFIGURED' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing token. Set SKYLOS_TOKEN env var.', code: 'NO_TOKEN' },
      { status: 401 }
    )
  }
  
  const token = authHeader.split(' ')[1]

  const tokenHash = hashApiKey(token);

  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('id, name, repo_url, org_id, organizations(id, name, plan, pro_expires_at)')
    .eq('api_key_hash', tokenHash)
    .single()

  if (projError || !project) {
    return NextResponse.json(
      { error: 'Invalid API token. Check your SKYLOS_TOKEN.', code: 'INVALID_TOKEN' },
      { status: 401 }
    )
  }

  const orgRef = project.organizations as any
  const org = Array.isArray(orgRef) ? orgRef[0] : orgRef
  const effectivePlan = getEffectivePlan({
    plan: String(org?.plan || 'free').toLowerCase(),
    pro_expires_at: org?.pro_expires_at || null,
  })
  const plan = effectivePlan
  const isPaid = plan === 'pro' || plan === 'enterprise'

  const capabilities = {
    pr_diff: true,
    suppressions: true,
    check_runs: true,
    verify: true,

    overrides: isPaid,
    sarif_import: isPaid,
  }

  return NextResponse.json({
    ok: true,
    project: {
      id: project.id,
      name: project.name,
      repo_url: project.repo_url,
    },
    organization: {
      id: org?.id,
      name: org?.name || 'My Workspace',
    },
    plan,
    capabilities,
  })
}
