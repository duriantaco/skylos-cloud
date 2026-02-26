import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { verifySignedState } from '@/lib/github-state'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const installationId = searchParams.get('installation_id')
  const state = searchParams.get('state')

  if (!installationId || !state) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=missing_params', req.url))
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

  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('org_id', project.org_id)
    .single()

  if (memberError || !member) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=unauthorized', req.url))
  }

  const { error } = await supabase
    .from('projects')
    .update({ github_installation_id: parseInt(installationId) })
    .eq('id', projectId)

  if (error) {
    console.error('Failed to save installation:', error)
    return NextResponse.redirect(new URL(`/dashboard/settings?project=${projectId}&error=save_failed`, req.url))
  }

  return NextResponse.redirect(new URL(`/dashboard/settings?project=${projectId}&success=github_installed`, req.url))
}
