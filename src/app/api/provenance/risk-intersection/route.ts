import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, isAuthError } from '@/lib/permissions';
import { getEffectivePlan, canViewProvenanceDetail } from '@/lib/entitlements';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const body = await request.json();
  const { scan_id } = body;

  if (!scan_id) {
    return NextResponse.json({ error: 'scan_id is required' }, { status: 400 });
  }

  const auth = await requirePermission(supabase, 'create:scans');
  if (isAuthError(auth)) return auth;

  const { data: org } = await supabase
    .from('organizations')
    .select('id, credits, plan, pro_expires_at')
    .eq('id', auth.orgId)
    .single();

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const effectivePlan = getEffectivePlan({ plan: org.plan, pro_expires_at: org.pro_expires_at });

  if (!canViewProvenanceDetail(effectivePlan)) {
    return NextResponse.json({ error: 'Workspace access required for risk intersection analysis' }, { status: 403 });
  }

  // Deduct credits (enterprise = free)
  if (effectivePlan !== 'enterprise') {
    const COST = 5;
    if (org.credits < COST) {
      return NextResponse.json({
        error: 'Insufficient credits',
        required: COST,
        available: org.credits,
        buy_url: '/dashboard/billing',
      }, { status: 402 });
    }

    const { error: deductError } = await supabase.rpc('deduct_credits', {
      p_org_id: org.id,
      p_amount: COST,
      p_description: 'AI provenance risk cross-analysis',
      p_metadata: {
        feature_key: 'provenance_risk_intersection',
        scan_id,
        user_id: auth.user.id,
        timestamp: new Date().toISOString(),
      },
    });

    if (deductError) {
      return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });
    }
  }

  // Fetch AI-authored files
  const { data: aiFiles } = await supabase
    .from('provenance_files')
    .select('file_path, agent_name, agent_lines')
    .eq('scan_id', scan_id)
    .eq('agent_authored', true);

  if (!aiFiles || aiFiles.length === 0) {
    return NextResponse.json({
      risk_files: [],
      summary: { total_ai_files: 0, files_with_findings: 0, files_with_low_defense: 0 },
    });
  }

  const aiFilePaths = aiFiles.map((f: any) => f.file_path);

  // Fetch findings for AI-authored files
  const { data: aiFindings } = await supabase
    .from('findings')
    .select('file_path, rule_id, severity, category, message, is_new')
    .eq('scan_id', scan_id)
    .in('file_path', aiFilePaths);

  // Fetch defense findings for AI-authored files
  const { data: defenseFindings } = await supabase
    .from('defense_findings')
    .select('location, plugin_id, severity, passed, message')
    .eq('scan_id', scan_id)
    .in('location', aiFilePaths);

  // Build risk intersection per file
  const findingsByFile = new Map<string, any[]>();
  for (const f of aiFindings || []) {
    const arr = findingsByFile.get(f.file_path) || [];
    arr.push(f);
    findingsByFile.set(f.file_path, arr);
  }

  const defenseByFile = new Map<string, any[]>();
  for (const d of defenseFindings || []) {
    const arr = defenseByFile.get(d.location) || [];
    arr.push(d);
    defenseByFile.set(d.location, arr);
  }

  const riskFiles = aiFiles
    .map((af: any) => {
      const fileFindings = findingsByFile.get(af.file_path) || [];
      const fileDefense = defenseByFile.get(af.file_path) || [];
      const failedDefense = fileDefense.filter((d: any) => !d.passed);

      return {
        file_path: af.file_path,
        agent_name: af.agent_name,
        findings_count: fileFindings.length,
        new_findings_count: fileFindings.filter((f: any) => f.is_new).length,
        findings: fileFindings,
        defense_failures: failedDefense,
        risk_level: fileFindings.length > 0 && failedDefense.length > 0 ? 'high'
          : fileFindings.length > 0 || failedDefense.length > 0 ? 'medium'
          : 'low',
      };
    })
    .filter((f: any) => f.risk_level !== 'low')
    .sort((a: any, b: any) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.risk_level as keyof typeof order] || 2) - (order[b.risk_level as keyof typeof order] || 2);
    });

  return NextResponse.json({
    risk_files: riskFiles,
    summary: {
      total_ai_files: aiFiles.length,
      files_with_findings: riskFiles.filter((f: any) => f.findings_count > 0).length,
      files_with_defense_failures: riskFiles.filter((f: any) => f.defense_failures.length > 0).length,
      high_risk_count: riskFiles.filter((f: any) => f.risk_level === 'high').length,
    },
  });
}
