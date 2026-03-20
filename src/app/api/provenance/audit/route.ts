import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/permissions';
import { getEffectivePlan, canUseProvenanceAudit } from '@/lib/entitlements';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const project_id = searchParams.get('project_id');
  const format = searchParams.get('format') || 'json';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!project_id) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
  }

  if (format !== 'json' && format !== 'csv') {
    return NextResponse.json({ error: 'format must be "json" or "csv"' }, { status: 400 });
  }

  const auth = await requirePermission(supabase, 'read:scans');
  if (isAuthError(auth)) return auth;

  const { data: org } = await supabase
    .from('organizations')
    .select('id, plan, pro_expires_at')
    .eq('id', auth.orgId)
    .single();

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const effectivePlan = getEffectivePlan({ plan: org.plan, pro_expires_at: org.pro_expires_at });

  if (!canUseProvenanceAudit(effectivePlan)) {
    return NextResponse.json(
      { error: 'Enterprise plan required for compliance audit export' },
      { status: 403 },
    );
  }

  // Build query: provenance_files joined with scans for metadata
  let query = supabase
    .from('provenance_files')
    .select(`
      file_path,
      agent_authored,
      agent_name,
      agent_lines,
      scan_id,
      scans!inner (
        commit_hash,
        branch,
        created_at
      )
    `)
    .eq('scans.project_id', project_id);

  if (from) {
    query = query.gte('scans.created_at', from);
  }
  if (to) {
    query = query.lte('scans.created_at', to);
  }

  const { data: rows, error } = await query.order('scans.created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch audit data', detail: error.message }, { status: 500 });
  }

  const records = (rows || []).map((row: any) => ({
    file_path: row.file_path,
    agent_authored: row.agent_authored,
    agent_name: row.agent_name,
    agent_lines: row.agent_lines,
    commit_hash: row.scans?.commit_hash ?? null,
    branch: row.scans?.branch ?? null,
    scan_date: row.scans?.created_at ?? null,
    scan_id: row.scan_id,
  }));

  if (format === 'csv') {
    const headers = ['file_path', 'agent_authored', 'agent_name', 'agent_lines', 'commit_hash', 'branch', 'scan_date', 'scan_id'];
    const csvRows = [headers.join(',')];

    for (const record of records) {
      const values = headers.map((h) => {
        const val = record[h as keyof typeof record];
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        // Escape CSV: wrap in quotes if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(values.join(','));
    }

    const csv = csvRows.join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=provenance-audit-${project_id}.csv`,
      },
    });
  }

  return NextResponse.json({ records, total: records.length });
}
