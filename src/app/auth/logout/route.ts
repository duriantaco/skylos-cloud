import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  console.log('[auth/logout] signing out')
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  console.log('[auth/logout] signOut result:', { error: error?.message ?? null })

  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/login`, { status: 302 })
}