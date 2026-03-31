import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { hashApiKey } from '@/lib/api-key'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return null
  }
  return createClient(url, key)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const { id } = await params

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  }
  const token = authHeader.split(' ')[1]

  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('id')
    .eq('api_key_hash', hashApiKey(token))
    .single()

  if (projError || !project) {
    return NextResponse.json({ error: 'Invalid API Token' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('scans')
    .select('quality_gate_passed, is_overridden, override_reason, project_id')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
  }
  if (data.project_id !== project.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    status: data.quality_gate_passed ? 'PASSED' : 'FAILED',
    is_overridden: data.is_overridden,
    override_reason: data.override_reason || null,
  })
}
