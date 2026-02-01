import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { hashApiKey } from "@/lib/api-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request: NextRequest) {
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
    .select('id, name, repo_url, org_id, organizations(id, name, plan)')
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
  const plan = String(org?.plan || 'free')
  const isPaid = plan === 'pro' || plan === 'enterprise'

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
    plan: plan,
    capabilities: {
      pr_diff: isPaid,
      suppressions: isPaid,
      overrides: isPaid,
      check_runs: isPaid,
      sarif_import: isPaid,
      verify: isPaid
    },
  })
}