import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { serverError } from "@/lib/api-error";
import { getEffectivePlan } from "@/lib/entitlements";
import { resolveProjectFromToken } from "@/lib/project-api-keys";

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
        { error: 'Missing token', code: 'NO_TOKEN' },
        { status: 401 }
        )
    }
  
    const token = authHeader.split(' ')[1]

    const resolved = await resolveProjectFromToken<{
      id: string;
      name: string;
      org_id: string;
      organizations: { id: string; name: string; plan: string | null; pro_expires_at: string | null } | { id: string; name: string; plan: string | null; pro_expires_at: string | null }[] | null;
    }>(
      supabase,
      token,
      'id, name, org_id, organizations(id, name, plan, pro_expires_at)'
    );

  const project = resolved?.project;

  if (!project) {
    return NextResponse.json(
      { error: 'Invalid API token', code: 'INVALID_TOKEN' },
      { status: 401 }
    )
  }

  const orgRef = project.organizations
  const org = Array.isArray(orgRef) ? orgRef[0] : orgRef
  const plan = getEffectivePlan({ plan: org?.plan || 'free', pro_expires_at: org?.pro_expires_at })
  const orgId = org?.id

  if (!['pro', 'enterprise'].includes(plan)) {
    return NextResponse.json({ 
      rules: [],
      count: 0,
      plan,
      message: 'Custom rules require a paid plan'
    })
  }

  const { data: rules, error: rulesError } = await supabase
    .from('custom_rules')
    .select('rule_id, name, description, severity, category, rule_type, yaml_config, python_code, enabled')
    .eq('org_id', orgId)
    .eq('enabled', true)

  if (rulesError) {
    return serverError(rulesError, "Fetch custom rules")
  }

  const filteredRules = (rules || []).filter(rule => {
    if (rule.rule_type === 'python' && !['pro', 'enterprise'].includes(plan)) {
      return false
    }
    return true
  })

  return NextResponse.json({
    rules: filteredRules,
    count: filteredRules.length,
    plan
  })
}
