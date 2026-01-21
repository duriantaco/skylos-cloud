import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function fingerprint(ruleId: string, filePath: string, line: number | null): string {
  const input = `${ruleId}|${filePath}|${line || ''}`
  return createHash('sha256').update(input).digest('hex').slice(0, 16)
}

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
    .select('id')
    .eq('api_key', token)
    .single()

  if (projError || !project) {
    return NextResponse.json(
      { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
      { status: 401 }
    )
  }

  const now = new Date().toISOString()
  
  const { data: rows, error: suppError } = await supabase
    .from('suppressions')
    .select('rule_id, file_path, line_number, reason, type, created_at, expires_at')
    .eq('project_id', project.id)
    .is('revoked_at', null)

  if (suppError) {
    console.error('Suppressions query error:', suppError)
    return NextResponse.json(
      { error: 'Failed to fetch suppressions' },
      { status: 500 }
    )
  }

  const suppressions = (rows || [])
    .filter((s: any) => !s.expires_at || s.expires_at > now)
    .map((s: any) => ({
      rule_id: s.rule_id,
      file_path: s.file_path,
      line_number: s.line_number,
      fingerprint: fingerprint(s.rule_id, s.file_path || '', s.line_number),
      reason: s.reason || '',
      type: s.type || 'false_positive',
      created_at: s.created_at,
      expires_at: s.expires_at,
    }))

  return NextResponse.json({
    version: 1,
    project_id: project.id,
    count: suppressions.length,
    suppressions,
  })
}