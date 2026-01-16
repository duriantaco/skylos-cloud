import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const installationId = searchParams.get('installation_id')
  const state = searchParams.get('state')
  
  if (!installationId || !state) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=missing_params', req.url))
  }

  const projectId = decodeURIComponent(state)
  
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { error } = await supabase
    .from('projects')
    .update({ github_installation_id: parseInt(installationId) })
    .eq('id', projectId)

  if (error) {
    console.error('Failed to save installation:', error)
    return NextResponse.redirect(new URL(`/dashboard/settings?project=${projectId}&error=save_failed`, req.url))
  }

  console.log(`✅ Linked installation ${installationId} to project ${projectId}`)
  
  return NextResponse.redirect(new URL(`/dashboard/settings?project=${projectId}&success=github_installed`, req.url))
}