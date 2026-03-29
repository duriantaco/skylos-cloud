import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { hashApiKey } from '@/lib/api-key'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { resolveActiveOrganizationForRequest } from '@/lib/active-org'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const VALID_COMMANDS = ['scan', 'verify', 'remediate', 'cleanup']

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Missing token. Run with --token or set SKYLOS_TOKEN env var.',
        code: 'NO_TOKEN'
      }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]
    const authMode = req.headers.get('x-skylos-auth')

    let project: any

    if (authMode === 'oidc') {
      const { verifyGitHubOIDC } = await import('@/lib/github-oidc')
      const claims = await verifyGitHubOIDC(token)
      if (!claims) {
        return NextResponse.json({
          error: 'Invalid OIDC token.',
          code: 'INVALID_OIDC'
        }, { status: 401 })
      }
      const repoUrl = `https://github.com/${claims.repository}`
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, org_id')
        .or(`repo_url.eq.${repoUrl},repo_url.eq.${repoUrl}.git`)
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        return NextResponse.json({
          error: `No project linked to ${claims.repository}.`,
          code: 'REPO_NOT_LINKED'
        }, { status: 404 })
      }
      project = data
    } else {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, org_id')
        .eq('api_key_hash', hashApiKey(token))
        .single()

      if (error || !data) {
        return NextResponse.json({
          error: 'Invalid API Token. Check your SKYLOS_TOKEN.',
          code: 'INVALID_TOKEN'
        }, { status: 403 })
      }
      project = data
    }

    const body = await req.json()
    const { command, model, provider, duration_seconds, summary, commit_hash, branch, actor, status } = body

    if (!command || !VALID_COMMANDS.includes(command)) {
      return NextResponse.json({
        error: `Invalid command. Must be one of: ${VALID_COMMANDS.join(', ')}`
      }, { status: 400 })
    }

    const { data: run, error: insertError } = await supabase
      .from('agent_runs')
      .insert({
        project_id: project.id,
        org_id: project.org_id,
        command,
        model: model || null,
        provider: provider || null,
        duration_seconds: duration_seconds || null,
        commit_hash: commit_hash || null,
        branch: branch || null,
        actor: actor || null,
        status: status || 'completed',
        summary: summary || {},
      })
      .select('id')
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save agent run' }, { status: 500 })
    }

    return NextResponse.json({ id: run.id, success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activeOrg = await resolveActiveOrganizationForRequest(supabase, user.id, {
      select: 'org_id',
    })

    if (!activeOrg.orgId) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 })
    }

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10)

    const { data: runs, error } = await supabase
      .from('agent_runs')
      .select('*, projects(name)')
      .eq('org_id', activeOrg.orgId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 200))

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 })
    }

    return NextResponse.json({ runs: runs || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
