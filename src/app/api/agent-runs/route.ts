import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { resolveActiveOrganizationForRequest } from '@/lib/active-org'
import { resolveOidcProject } from '@/lib/oidc-project'
import { resolveProjectFromToken } from '@/lib/project-api-keys'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const VALID_COMMANDS = ['scan', 'verify', 'remediate', 'cleanup']
type TokenProject = { id: string; name: string; org_id: string }

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

    let project: TokenProject

    if (authMode === 'oidc') {
      const { verifyGitHubOIDC } = await import('@/lib/github-oidc')
      const claims = await verifyGitHubOIDC(token)
      if (!claims) {
        return NextResponse.json({
          error: 'Invalid OIDC token.',
          code: 'INVALID_OIDC'
        }, { status: 401 })
      }
      const resolution = await resolveOidcProject<{ id: string; name: string; org_id: string }>(
        supabase,
        claims.repository,
        'id, name, org_id'
      )

      if (resolution.kind === 'not_found') {
        return NextResponse.json({
          error: `No project linked to ${claims.repository}.`,
          code: 'REPO_NOT_LINKED'
        }, { status: 404 })
      }

      if (resolution.kind === 'ambiguous') {
        return NextResponse.json({
          error: `Multiple projects are linked to ${claims.repository}. OIDC uploads require a unique repo-to-project binding.`,
          code: 'AMBIGUOUS_REPO_BINDING',
        }, { status: 409 })
      }

      project = resolution.project
    } else {
      const resolved = await resolveProjectFromToken<{
        id: string;
        name: string;
        org_id: string;
      }>(
        supabase,
        token,
        'id, name, org_id'
      )

      if (!resolved?.project) {
        return NextResponse.json({
          error: 'Invalid API Token. Check your SKYLOS_TOKEN.',
          code: 'INVALID_TOKEN'
        }, { status: 403 })
      }
      project = resolved.project
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
