import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { serverError } from '@/lib/api-error';
import { resolveProjectFromToken } from '@/lib/project-api-keys';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return null
  }
  return createClient(url, key)
}

type SuppressionRow = {
  rule_id?: string | null;
  file_path?: string | null;
  line_number?: number | null;
  reason?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
};

function fingerprint(ruleId: string, filePath: string, line: number | null): string {
  const input = `${ruleId}|${filePath}|${line || ''}`
  return createHash('sha256').update(input).digest('hex').slice(0, 16)
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

  const resolved = await resolveProjectFromToken<{ id: string }>(
    supabase,
    token,
    'id'
  );
  const project = resolved?.project;

  if (!project) {
    return NextResponse.json(
      { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
      { status: 401 }
    )
  }

  const now = new Date().toISOString()
  
  const { data: rows, error: suppError } = await supabase
    .from('finding_suppressions')
    .select('rule_id, file_path, line_number, reason, created_at, expires_at')
    .eq('project_id', project.id)
    .is('revoked_at', null)

  if (suppError) {
    return serverError(suppError, "Suppressions query");
  }

  const suppressionRows = (rows || []) as SuppressionRow[];
  const suppressions = suppressionRows
    .filter((s) => !s.expires_at || s.expires_at > now)
    .map((s) => ({
      rule_id: s.rule_id,
      file_path: s.file_path,
      line_number: s.line_number,
      fingerprint: fingerprint(
        String(s.rule_id || "UNKNOWN"),
        s.file_path || '',
        s.line_number ?? null
      ),
      reason: s.reason || '',
      type: 'false_positive',
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
