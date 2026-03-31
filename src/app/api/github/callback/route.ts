import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { verifySignedState } from '@/lib/github-state'
import { requirePermission, isAuthError } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const installationIdParam = searchParams.get('installation_id')
  const state = searchParams.get('state')

  if (!installationIdParam || !state) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=missing_params', req.url))
  }

  const installationId = Number.parseInt(installationIdParam, 10)
  if (!Number.isInteger(installationId) || installationId <= 0) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=invalid_installation', req.url))
  }

  // Verify HMAC-signed state to prevent CSRF
  const projectId = verifySignedState(decodeURIComponent(state))
  if (!projectId) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=invalid_state', req.url))
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=project_not_found', req.url))
  }

  const auth = await requirePermission(supabase, 'manage:settings', project.org_id)
  if (isAuthError(auth)) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=unauthorized', req.url))
  }

  const { error } = await supabase
    .from('projects')
    .update({ github_installation_id: installationId })
    .eq('id', projectId)

  if (error) {
    console.error('Failed to save installation:', error)
    return NextResponse.redirect(new URL(`/dashboard/settings?project=${projectId}&error=save_failed`, req.url))
  }

  return NextResponse.redirect(new URL(`/dashboard/settings?project=${projectId}&success=github_installed`, req.url))
}
