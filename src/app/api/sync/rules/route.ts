import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { serverError } from "@/lib/api-error";
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
        { error: 'Missing token', code: 'NO_TOKEN' },
        { status: 401 }
        )
    }
  
    const token = authHeader.split(' ')[1]

    const { data: project, error: projError } = await supabase
        .from('projects')
        .select('id, name, org_id, organizations(id, name, plan)')
        .eq('api_key_hash', hashApiKey(token))
        .single()

  if (projError || !project) {
    return NextResponse.json(
      { error: 'Invalid API token', code: 'INVALID_TOKEN' },
      { status: 401 }
    )
  }

  const orgRef = project.organizations as any
  const org = Array.isArray(orgRef) ? orgRef[0] : orgRef
  const plan = String(org?.plan || 'free')
  const orgId = org?.id

  if (!['pro', 'team', 'enterprise'].includes(plan)) {
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
    if (rule.rule_type === 'python' && !['team', 'enterprise'].includes(plan)) {
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