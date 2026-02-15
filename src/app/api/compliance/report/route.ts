import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateComplianceReport } from '@/lib/compliance/report-generator';
import { serverError } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { frameworkCode, format = 'json' } = body;

    if (!frameworkCode) {
      return NextResponse.json({ error: 'frameworkCode is required' }, { status: 400 });
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('org_id, organizations(plan, name)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const orgId = member.org_id;
    const plan = (member.organizations as any)?.plan || 'free';

    if (!['team', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Compliance reports require Team or Enterprise plan' },
        { status: 403 }
      );
    }

    const reportData = await generateComplianceReport(frameworkCode, orgId, supabase);

    switch (format) {
      case 'json':
        return NextResponse.json(reportData);

      case 'csv':
        const csv = generateCSV(reportData);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="compliance-report-${frameworkCode}-${Date.now()}.csv"`
          }
        });

      case 'html':
        const html = generateHTML(reportData);
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="compliance-report-${frameworkCode}-${Date.now()}.html"`
          }
        });

      default:
        return NextResponse.json({ error: 'Invalid format. Use json, csv, or html' }, { status: 400 });
    }

  } catch (error: any) {
    return serverError(error, 'Generate compliance report');
  }
}

function generateCSV(reportData: any): string {
  const lines: string[] = [];

  lines.push(`Compliance Report - ${reportData.framework.name} ${reportData.framework.version}`);
  lines.push(`Organization,${reportData.orgName}`);
  lines.push(`Project,${reportData.projectName}`);
  lines.push(`Generated,${new Date(reportData.generatedAt).toLocaleDateString()}`);
  lines.push('');

  lines.push('Summary');
  lines.push(`Total Requirements,${reportData.summary.totalRequirements}`);
  lines.push(`Covered Requirements,${reportData.summary.coveredRequirements}`);
  lines.push(`Coverage,${reportData.summary.coveragePercent}%`);
  lines.push(`Compliance Score,${reportData.summary.complianceScore}%`);
  lines.push(`Passed,${reportData.summary.passedRequirements}`);
  lines.push(`Failed,${reportData.summary.failedRequirements}`);
  lines.push(`Total Findings,${reportData.summary.totalFindings}`);
  lines.push('');

  lines.push('Requirement ID,Description,Status,Findings Count,Related Rules,Last Scanned');
  reportData.requirements.forEach((req: any) => {
    lines.push([
      req.requirementId,
      `"${req.description.replace(/"/g, '""')}"`,
      req.status,
      req.findingsCount,
      req.relatedRules.join('; '),
      req.lastScanned ? new Date(req.lastScanned).toLocaleDateString() : 'Not scanned'
    ].join(','));
  });

  return lines.join('\n');
}

function generateHTML(reportData: any): string {
  const statusColor = (status: string) => {
    switch (status) {
      case 'passed': 
        return '#10b981';
      case 'failed': 
        return '#ef4444';
      default: 
        return '#94a3b8';
    }
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Compliance Report - ${reportData.framework.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f8fafc;
      color: #1e293b;
    }
    .header {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      margin: 0 0 10px 0;
      color: #0f172a;
      font-size: 28px;
    }
    .meta {
      color: #64748b;
      font-size: 14px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #0f172a;
    }
    .summary-card .suffix {
      font-size: 18px;
      color: #94a3b8;
    }
    .requirements {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      text-align: left;
      padding: 12px;
      background: #f1f5f9;
      font-weight: 600;
      font-size: 13px;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: white;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${reportData.framework.name} ${reportData.framework.version} Compliance Report</h1>
    <div class="meta">
      <strong>${reportData.orgName}</strong> • ${reportData.projectName} •
      Generated ${new Date(reportData.generatedAt).toLocaleDateString()}
    </div>
  </div>

  <div class="summary">
    <div class="summary-card">
      <h3>Compliance Score</h3>
      <div class="value">${reportData.summary.complianceScore}<span class="suffix">%</span></div>
    </div>
    <div class="summary-card">
      <h3>Coverage</h3>
      <div class="value">${reportData.summary.coveragePercent}<span class="suffix">%</span></div>
    </div>
    <div class="summary-card">
      <h3>Requirements</h3>
      <div class="value">${reportData.summary.passedRequirements}<span class="suffix">/${reportData.summary.totalRequirements}</span></div>
    </div>
    <div class="summary-card">
      <h3>Total Findings</h3>
      <div class="value">${reportData.summary.totalFindings}</div>
    </div>
  </div>

  <div class="requirements">
    <h2 style="margin-top: 0;">Requirements Status</h2>
    <table>
      <thead>
        <tr>
          <th>Requirement</th>
          <th>Description</th>
          <th>Status</th>
          <th>Findings</th>
          <th>Last Scanned</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.requirements.map((req: any) => `
          <tr>
            <td style="font-weight: 600;">${req.requirementId}</td>
            <td>${req.description}</td>
            <td>
              <span class="status-badge" style="background: ${statusColor(req.status)};">
                ${req.status}
              </span>
            </td>
            <td>${req.findingsCount || '-'}</td>
            <td>${req.lastScanned ? new Date(req.lastScanned).toLocaleDateString() : 'Not scanned'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Generated by <strong>Skylos</strong> • skylos.dev
  </div>
</body>
</html>
  `.trim();
}
