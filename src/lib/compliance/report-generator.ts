import { COMPLIANCE_MAPPINGS, getAllRequirementsForFramework, getComplianceInfo } from './mappings';

export type ComplianceReportData = {
  framework: {
    code: string;
    name: string;
    version: string;
  };
  generatedAt: string;
  orgName: string;
  projectName: string;
  summary: {
    totalRequirements: number;
    coveredRequirements: number;
    coveragePercent: number;
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    passedRequirements: number;
    failedRequirements: number;
    complianceScore: number;
  };
  requirements: ComplianceRequirement[];
  findingsByRule: Record<string, Finding[]>;
};

export type ComplianceRequirement = {
  requirementId: string;
  description: string;
  relatedRules: string[];
  status: 'passed' | 'failed' | 'not_scanned';
  findingsCount: number;
  lastScanned: string | null;
};

export type Finding = {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  filePath: string;
  lineNumber: number;
  message: string;
  scanDate: string;
  status: 'open' | 'suppressed' | 'resolved';
};

export async function generateComplianceReport(
  frameworkCode: string,
  orgId: string,
  supabase: any
): Promise<ComplianceReportData> {
  const { data: framework, error: fwErr } = await supabase
    .from('compliance_frameworks')
    .select('code, name, version')
    .eq('code', frameworkCode)
    .single();

  if (fwErr || !framework) {
    throw new Error(`Framework ${frameworkCode} not found`);
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('org_id', orgId);

  const projectIds = projects?.map((p: any) => p.id) || [];
  const projectName = projects?.[0]?.name || 'All Projects';

  const allRequirements = getAllRequirementsForFramework(frameworkCode);

  const relevantRuleIds = COMPLIANCE_MAPPINGS
    .filter(mapping => mapping.frameworks[frameworkCode])
    .map(mapping => mapping.ruleId);

  const { data: latestScans } = await supabase
    .from('scans')
    .select('id, project_id, created_at, commit_hash')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false });

  const scanIds = new Map();
  latestScans?.forEach((scan: any) => {
    if (!scanIds.has(scan.project_id)) {
      scanIds.set(scan.project_id, scan.id);
    }
  });

  const uniqueScanIds = Array.from(scanIds.values());

  const { data: findings } = await supabase
    .from('findings')
    .select('id, rule_id, severity, file_path, line_number, message, created_at, is_suppressed, scan_id')
    .in('scan_id', uniqueScanIds)
    .in('rule_id', relevantRuleIds);

  const findingsByRule: Record<string, Finding[]> = {};
  let totalFindings = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  findings?.forEach((f: any) => {
    const finding: Finding = {
      id: f.id,
      ruleId: f.rule_id,
      ruleName: COMPLIANCE_MAPPINGS.find(m => m.ruleId === f.rule_id)?.ruleName || f.rule_id,
      severity: f.severity || 'medium',
      filePath: f.file_path,
      lineNumber: f.line_number,
      message: f.message,
      scanDate: f.created_at,
      status: f.is_suppressed ? 'suppressed' : 'open'
    };

    if (!findingsByRule[f.rule_id]) {
      findingsByRule[f.rule_id] = [];
    }
    findingsByRule[f.rule_id].push(finding);

    if (!f.is_suppressed) {
      totalFindings++;
      const sev = f.severity?.toLowerCase();
      if (sev === 'critical') criticalCount++;
      else if (sev === 'high') highCount++;
      else if (sev === 'medium') mediumCount++;
      else if (sev === 'low') lowCount++;
    }
  });

  const requirements: ComplianceRequirement[] = [];
  const requirementMap = new Map<string, ComplianceRequirement>();

  allRequirements.forEach(reqId => {
    if (!requirementMap.has(reqId)) {
      requirementMap.set(reqId, {
        requirementId: reqId,
        description: '',
        relatedRules: [],
        status: 'not_scanned',
        findingsCount: 0,
        lastScanned: null
      });
    }
  });

  COMPLIANCE_MAPPINGS.forEach(mapping => {
    const frameworkInfo = mapping.frameworks[frameworkCode];
    if (!frameworkInfo) 
      return;

    frameworkInfo.requirements.forEach(reqId => {
      const req = requirementMap.get(reqId);
      if (req) {
        req.relatedRules.push(mapping.ruleId);
        req.description = frameworkInfo.description;

        // Check if this rule has findings
        const ruleFindinds = findingsByRule[mapping.ruleId] || [];
        const openFindings = ruleFindinds.filter(f => f.status === 'open');

        if (openFindings.length > 0) {
          req.status = 'failed';
          req.findingsCount += openFindings.length;
        } else if (ruleFindinds.length > 0) {
          req.status = 'passed';
        } else if (uniqueScanIds.length > 0) {
          req.status = 'passed';
        }

        ruleFindinds.forEach(f => {
          if (!req.lastScanned || f.scanDate > req.lastScanned) {
            req.lastScanned = f.scanDate;
          }
        });
      }
    });
  });

  const requirementsArray = Array.from(requirementMap.values());
  const passedCount = requirementsArray.filter(r => r.status === 'passed').length;
  const failedCount = requirementsArray.filter(r => r.status === 'failed').length;
  const coveredCount = passedCount + failedCount;
  const coveragePercent = allRequirements.length > 0
    ? Math.round((coveredCount / allRequirements.length) * 100)
    : 0;

  const complianceScore = coveredCount > 0
    ? Math.round((passedCount / coveredCount) * 100)
    : 0;

  return {
    framework: {
      code: framework.code,
      name: framework.name,
      version: framework.version
    },
    generatedAt: new Date().toISOString(),
    orgName: org?.name || 'Organization',
    projectName,
    summary: {
      totalRequirements: allRequirements.length,
      coveredRequirements: coveredCount,
      coveragePercent,
      totalFindings,
      criticalFindings: criticalCount,
      highFindings: highCount,
      mediumFindings: mediumCount,
      lowFindings: lowCount,
      passedRequirements: passedCount,
      failedRequirements: failedCount,
      complianceScore
    },
    requirements: requirementsArray.sort((a, b) => a.requirementId.localeCompare(b.requirementId)),
    findingsByRule
  };
}
