'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, ExternalLink, CheckCircle, XCircle,
  GitCommit, FileCode, Shield, Eye, History,
  ChevronRight, Layers, ArrowUpRight, Trash2, Bug,
  Key, Zap, X
} from 'lucide-react';
import IssueComments from '@/components/IssueComments';
import AssignIssue from '@/components/AssignIssue';
import ProFeatureLock from '@/components/ProFeatureLock';
import {
  getExceptionStatusLabel,
  getIssueGroupStatusLabel,
  type ExceptionRequestStatus,
} from '@/lib/exception-governance';


type IssueGroup = {
  id: string;
  rule_id: string;
  category: string;
  severity: string;
  canonical_file: string;
  canonical_line: number;
  canonical_snippet: string | null;
  occurrence_count: number;
  affected_files: string[];
  verification_status: string | null;
  suggested_fix: { before: string; after: string; explanation: string } | null;
  data_flow: unknown;
  status: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  last_seen_scan_id: string | null;
  project_id: string;
};

type Finding = {
  id: string;
  scan_id: string | null;
  file_path: string;
  line_number: number;
  message: string;
  snippet: string | null;
  is_new: boolean;
  created_at: string;
  scans?: {
    branch: string | null;
    commit_hash: string | null;
    created_at: string | null;
  } | null;
};

type Project = {
  name: string;
  repo_url: string | null;
};

type ExceptionRequestSummary = {
  id: string;
  status: string;
  effective_status: ExceptionRequestStatus;
  justification: string;
  expires_at: string | null;
  requested_at: string;
  decided_at: string | null;
  requester_email: string | null;
  reviewer_email: string | null;
};

const CATEGORY_CONTEXT: Record<string, {
  icon: import('lucide-react').LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  lightBg: string;
  whatIsThis: string;
  riskLabel: string;
  defaultDescription: string;
  defaultRisk: string;
  defaultRemediation: string;
}> = {
  SECURITY: {
    icon: Shield,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    lightBg: 'bg-rose-50/50',
    whatIsThis: 'Security Vulnerability',
    riskLabel: 'Security Risk',
    defaultDescription: 'A potential security vulnerability that could be exploited by attackers.',
    defaultRisk: 'This issue may expose your application to unauthorized access, data breaches, or system compromise.',
    defaultRemediation: 'Review the flagged code and apply appropriate security controls.',
  },
  SECRET: {
    icon: Key,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    lightBg: 'bg-purple-50/50',
    whatIsThis: 'Exposed Secret',
    riskLabel: 'Exposure Risk',
    defaultDescription: 'Sensitive credentials, API keys, or passwords detected in source code.',
    defaultRisk: 'Secrets in code can be extracted from version control history or compiled binaries, leading to unauthorized access to external services.',
    defaultRemediation: 'Remove the secret from code, rotate it immediately, and use environment variables or a secrets manager instead.',
  },
  QUALITY: {
    icon: Bug,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    lightBg: 'bg-blue-50/50',
    whatIsThis: 'Code Quality Issue',
    riskLabel: 'Technical Debt',
    defaultDescription: 'Code that may cause bugs, reduce maintainability, or violate best practices.',
    defaultRisk: 'May lead to bugs, harder maintenance, or performance issues over time. Not a security vulnerability.',
    defaultRemediation: 'Refactor the code to follow best practices and improve maintainability.',
  },
  DEAD_CODE: {
    icon: Trash2,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    lightBg: 'bg-slate-50/50',
    whatIsThis: 'Unused Code',
    riskLabel: 'Maintenance Burden',
    defaultDescription: 'Code that is never executed or referenced anywhere in the codebase.',
    defaultRisk: 'Increases codebase complexity and maintenance burden without providing value. Not a security vulnerability.',
    defaultRemediation: 'Safely remove the unused code after verifying it has no side effects.',
  },
};

const RULE_INFO: Record<string, { 
  title: string; 
  description: string; 
  risk: string;
  cwe?: string;
  owasp?: string;
  remediation: string;
}> = {
  'SKY-D201': {
    title: 'Dangerous eval() Call',
    description: 'The eval() function executes arbitrary code from a string. If user input reaches eval(), attackers can execute any Python code.',
    risk: 'Attackers can execute arbitrary code on your server, leading to complete system compromise, data theft, or lateral movement.',
    cwe: 'CWE-95',
    owasp: 'A03:2021 Injection',
    remediation: 'Use ast.literal_eval() for safe evaluation of literals, or implement a whitelist-based parser for specific use cases.',
  },
  'SKY-D202': {
    title: 'Dangerous exec() Call',
    description: 'The exec() function executes arbitrary Python code from a string. This is extremely dangerous if user input is involved.',
    risk: 'Attackers can execute arbitrary code on your server, leading to complete system compromise.',
    cwe: 'CWE-95',
    owasp: 'A03:2021 Injection',
    remediation: 'Avoid exec() entirely. Use safer alternatives like importlib for dynamic imports or implement a restricted DSL.',
  },
  'SKY-D203': {
    title: 'Dangerous os.system() Call',
    description: 'os.system() executes shell commands. Even without user input, it can be vulnerable to environment manipulation.',
    risk: 'If user input reaches this function, attackers can execute arbitrary shell commands on your server.',
    cwe: 'CWE-78',
    owasp: 'A03:2021 Injection',
    remediation: 'Use subprocess.run() with a list of arguments and shell=False instead.',
  },
  'SKY-D205': {
    title: 'Dangerous pickle.loads() Call',
    description: 'pickle.loads() deserializes Python objects from untrusted data. Malicious pickles can execute arbitrary code during deserialization.',
    risk: 'Attackers can achieve remote code execution by crafting malicious pickle payloads.',
    cwe: 'CWE-502',
    owasp: 'A08:2021 Software and Data Integrity Failures',
    remediation: 'Never unpickle data from untrusted sources. Use JSON or other safe serialization formats.',
  },
  'SKY-D206': {
    title: 'Unsafe yaml.load() Call',
    description: 'yaml.load() without SafeLoader can execute arbitrary Python code embedded in YAML files.',
    risk: 'Attackers can achieve remote code execution through malicious YAML payloads.',
    cwe: 'CWE-502',
    owasp: 'A08:2021 Software and Data Integrity Failures',
    remediation: 'Always use yaml.safe_load() or yaml.load(data, Loader=yaml.SafeLoader).',
  },
  'SKY-D207': {
    title: 'Weak Hash Algorithm (MD5)',
    description: 'MD5 is cryptographically broken and should not be used for security purposes like password hashing or integrity verification.',
    risk: 'MD5 hashes can be reversed or collided, making them unsuitable for passwords or security-sensitive data.',
    cwe: 'CWE-328',
    remediation: 'Use SHA-256 or SHA-3 for integrity checks. Use bcrypt, scrypt, or Argon2 for password hashing.',
  },
  'SKY-D208': {
    title: 'Weak Hash Algorithm (SHA1)',
    description: 'SHA1 has known collision vulnerabilities and is deprecated for security purposes.',
    risk: 'SHA1 collisions are practical, making it unsuitable for digital signatures or certificate verification.',
    cwe: 'CWE-328',
    remediation: 'Use SHA-256 or SHA-3 for integrity checks. Use bcrypt, scrypt, or Argon2 for password hashing.',
  },
  'SKY-D209': {
    title: 'Subprocess with shell=True',
    description: 'Using subprocess with shell=True passes commands through the shell, enabling shell injection if user input is involved.',
    risk: 'Attackers can inject shell metacharacters to execute arbitrary commands.',
    cwe: 'CWE-78',
    owasp: 'A03:2021 Injection',
    remediation: 'Use subprocess.run() with a list of arguments and shell=False.',
  },
  'SKY-D210': {
    title: 'TLS Verification Disabled',
    description: 'Setting verify=False disables SSL/TLS certificate verification, allowing man-in-the-middle attacks.',
    risk: 'Attackers on the network can intercept and modify traffic, stealing credentials or injecting malicious responses.',
    cwe: 'CWE-295',
    owasp: 'A07:2021 Identification and Authentication Failures',
    remediation: 'Always use verify=True (the default). If you need custom CA certificates, use the verify parameter to specify them.',
  },
  'SKY-D211': {
    title: 'SQL Injection',
    description: 'User input is concatenated or interpolated directly into SQL queries without proper parameterization.',
    risk: 'Attackers can manipulate database queries to access, modify, or delete data. Can lead to complete database compromise.',
    cwe: 'CWE-89',
    owasp: 'A03:2021 Injection',
    remediation: 'Use parameterized queries: cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))',
  },
  'SKY-D212': {
    title: 'Command Injection',
    description: 'User-controlled input flows into a shell command, allowing attackers to execute arbitrary commands.',
    risk: 'Attackers can execute any command on your server with the privileges of the application.',
    cwe: 'CWE-78',
    owasp: 'A03:2021 Injection',
    remediation: 'Use subprocess.run() with a list of arguments and shell=False. Validate and sanitize all user input.',
  },
  'SKY-D215': {
    title: 'Path Traversal',
    description: 'User input is used to construct file paths without proper validation, allowing access to files outside intended directories.',
    risk: 'Attackers can read sensitive files like /etc/passwd or overwrite critical system files.',
    cwe: 'CWE-22',
    owasp: 'A01:2021 Broken Access Control',
    remediation: 'Use os.path.realpath() and verify the resolved path starts with your allowed directory. Use allowlists for filenames.',
  },
  'SKY-D216': {
    title: 'Server-Side Request Forgery (SSRF)',
    description: 'User-controlled URLs are passed to HTTP clients, allowing attackers to make requests to internal services.',
    risk: 'Attackers can access internal services, cloud metadata endpoints, or scan internal networks.',
    cwe: 'CWE-918',
    owasp: 'A10:2021 Server-Side Request Forgery',
    remediation: 'Validate URLs against an allowlist of permitted domains. Block requests to private IP ranges and localhost.',
  },
  'SKY-D217': {
    title: 'SQL Injection',
    description: 'User input is concatenated or interpolated directly into SQL queries without proper parameterization.',
    risk: 'Attackers can manipulate database queries to access, modify, or delete data. Can lead to complete database compromise.',
    cwe: 'CWE-89',
    owasp: 'A03:2021 Injection',
    remediation: 'Use parameterized queries: cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))',
  },
  'SKY-D226': {
    title: 'Cross-Site Scripting (XSS) via Markup',
    description: 'User-controlled content is passed to Markup() or mark_safe(), bypassing HTML escaping.',
    risk: 'Attackers can inject malicious scripts that execute in users\' browsers, stealing sessions or credentials.',
    cwe: 'CWE-79',
    owasp: 'A03:2021 Injection',
    remediation: 'Always escape user content: Markup(escape(user_content)). Never mark user input as safe.',
  },
  'SKY-D227': {
    title: 'Cross-Site Scripting (XSS) via Template',
    description: 'Template uses |safe filter or disables autoescape, allowing unescaped user content to be rendered.',
    risk: 'Attackers can inject malicious scripts that execute in users\' browsers.',
    cwe: 'CWE-79',
    owasp: 'A03:2021 Injection',
    remediation: 'Remove |safe filters from user-controlled content. Keep autoescape enabled.',
  },
  'SKY-D228': {
    title: 'Cross-Site Scripting (XSS) via HTML Building',
    description: 'HTML strings are built by concatenating user input without proper escaping.',
    risk: 'Attackers can inject malicious scripts that execute in users\' browsers.',
    cwe: 'CWE-79',
    owasp: 'A03:2021 Injection',
    remediation: 'Use a templating engine with auto-escaping, or explicitly escape all user input with html.escape().',
  },
  'SKY-S101': {
    title: 'Hardcoded Secret',
    description: 'Sensitive credentials, API keys, or passwords are hardcoded directly in source code.',
    risk: 'Secrets in code can be extracted from version control history, logs, or compiled binaries, leading to unauthorized access.',
    cwe: 'CWE-798',
    owasp: 'A07:2021 Identification and Authentication Failures',
    remediation: 'Use environment variables: API_KEY = os.environ.get("API_KEY"). Never commit secrets to version control.',
  },
};

function getRuleInfo(ruleId: string, category: string) {
  const info = RULE_INFO[ruleId.toUpperCase()];
  const ctx = CATEGORY_CONTEXT[category.toUpperCase()] || CATEGORY_CONTEXT.QUALITY;
  
  if (info) return info;
  
  return {
    title: formatRuleName(ruleId),
    description: ctx.defaultDescription,
    risk: ctx.defaultRisk,
    remediation: ctx.defaultRemediation,
  };
}

function getCategoryContext(category: string) {
  return CATEGORY_CONTEXT[category.toUpperCase()] || CATEGORY_CONTEXT.QUALITY;
}

function formatRuleName(ruleId: string): string {
  return ruleId.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function timeAgo(dateString: string | null) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function addDaysIso(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function SeverityBadge({ severity, size = 'md' }: { severity: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = (severity || 'UNKNOWN').toUpperCase();
  const styles = {
    CRITICAL: 'bg-rose-100 text-rose-700 ring-rose-600/20',
    HIGH: 'bg-orange-100 text-orange-700 ring-orange-600/20',
    MEDIUM: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    LOW: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    UNKNOWN: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  };
  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };
  return (
    <span className={`font-bold rounded-md ring-1 ring-inset ${styles[s as keyof typeof styles] || styles.UNKNOWN} ${sizes[size]}`}>
      {s}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const ctx = getCategoryContext(category);
  const Icon = ctx.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md ${ctx.bgColor} ${ctx.color} border ${ctx.borderColor}`}>
      <Icon className="w-3.5 h-3.5" />
      {ctx.whatIsThis}
    </span>
  );
}

function VerificationBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s === 'VERIFIED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3 h-3" />
        Verified Exploitable
      </span>
    );
  }
  if (s === 'REFUTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600 border border-slate-200">
        <XCircle className="w-3 h-3" />
        False Positive
      </span>
    );
  }
  return null;
}

function StatCard({ icon, label, value, subtext }: { icon: React.ReactNode; label: string; value: string | number; subtext?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
    </div>
  );
}

export default function IssueDetailClient({ group, plan = 'free' }: { group: IssueGroup; plan?: string }) {
  const searchParams = useSearchParams();
  const [groupStatus, setGroupStatus] = useState(group.status);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [exceptionRequests, setExceptionRequests] = useState<ExceptionRequestSummary[]>([]);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exceptionJustification, setExceptionJustification] = useState('');
  const [exceptionExpiry, setExceptionExpiry] = useState<'NEVER' | '7' | '30' | '90'>('30');
  const [isSubmittingException, setIsSubmittingException] = useState(false);
  const [exceptionError, setExceptionError] = useState<string | null>(null);

  const ruleInfo = getRuleInfo(group.rule_id, group.category);
  const categoryContext = getCategoryContext(group.category);
  const CategoryIcon = categoryContext.icon;
  const openExceptionModal = useCallback(() => {
    setExceptionError(null);
    setExceptionJustification('');
    setExceptionExpiry('30');
    setExceptionOpen(true);
  }, []);

  useEffect(() => {
    async function loadProject() {
      const supabase = createClient();
      const { data } = await supabase
        .from('projects')
        .select('name, repo_url, org_id')
        .eq('id', group.project_id)
        .single();
      if (data) {
        const projectRecord = data as Project & { org_id: string | null };
        setProject(projectRecord);
        setOrgId(projectRecord.org_id);
      }
    }
    loadProject();
  }, [group.project_id]);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function loadFindings() {
      const supabase = createClient();
      const { data } = await supabase
        .from('findings')
        .select('id, scan_id, file_path, line_number, message, snippet, is_new, created_at, scans(branch, commit_hash, created_at)')
        .eq('group_id', group.id)
        .order('created_at', { ascending: false })
        .limit(100);
      setFindings(
        ((data || []) as Array<Finding & { scans?: Array<Finding["scans"]> | Finding["scans"] }>).map((finding) => ({
          ...finding,
          scans: Array.isArray(finding.scans) ? (finding.scans[0] ?? null) : (finding.scans ?? null),
        }))
      );
    }
    loadFindings();
  }, [group.id]);

  useEffect(() => {
    async function loadExceptionRequests() {
      if (plan === 'free') return;
      try {
        const res = await fetch(`/api/exception-requests?issueGroupId=${group.id}&limit=5`);
        if (!res.ok) return;
        const data = await res.json();
        setExceptionRequests(Array.isArray(data.requests) ? data.requests : []);
      } catch (error) {
        console.error('Failed to load exception requests:', error);
      }
    }

    loadExceptionRequests();
  }, [group.id, plan]);

  useEffect(() => {
    if (searchParams.get('requestException') === '1' && plan !== 'free') {
      openExceptionModal();
    }
  }, [openExceptionModal, plan, searchParams]);

  const lastSeenScanHref = group.last_seen_scan_id ? `/dashboard/scans/${group.last_seen_scan_id}` : null;
  const affectedFileCount = new Set(findings.map((finding) => finding.file_path)).size;
  const findingsByScan = findings;
  const latestException = exceptionRequests[0] || null;
  const canRequestAnotherException =
    !latestException ||
    ['rejected', 'revoked', 'expired'].includes(latestException.effective_status);

  async function submitExceptionRequest() {
    const justification = exceptionJustification.trim();
    if (justification.length < 8) {
      setExceptionError('Add a clear justification before requesting an exception.');
      return;
    }

    const expires_at =
      exceptionExpiry === 'NEVER' ? null : addDaysIso(parseInt(exceptionExpiry, 10));

    setIsSubmittingException(true);
    setExceptionError(null);
    try {
      const res = await fetch(`/api/issue-groups/${group.id}/exception-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justification, expires_at }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request exception');
      }

      const refreshRes = await fetch(`/api/exception-requests?issueGroupId=${group.id}&limit=5`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setExceptionRequests(Array.isArray(refreshData.requests) ? refreshData.requests : []);
      } else {
        setExceptionRequests((prev) => [data.request, ...prev]);
      }
      setGroupStatus('pending_exception');
      setExceptionJustification('');
      setExceptionExpiry('30');
      setExceptionOpen(false);
    } catch (error) {
      setExceptionError(error instanceof Error ? error.message : 'Failed to request exception');
    } finally {
      setIsSubmittingException(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link href="/dashboard/issues" className="hover:text-slate-900 transition flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Recurring Issues
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span>{project?.name || 'Loading...'}</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-medium truncate max-w-xs">{group.rule_id}</span>
          </div>

          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <SeverityBadge severity={group.severity} size="lg" />
                <CategoryBadge category={group.category} />
                <VerificationBadge status={group.verification_status} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{ruleInfo.title}</h1>
              <p className="text-slate-500 text-sm">
                Rule: <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs">{group.rule_id}</code>
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mt-2">
                Secondary view: recurring record across scans
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {lastSeenScanHref && (
                <Link
                  href={lastSeenScanHref}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition shadow-sm"
                >
                  <History className="w-4 h-4" />
                  Open last seen scan
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-sky-700">Recurring Issue Record</div>
              <p className="mt-1 text-sm text-sky-900">
                This page tracks the same root cause across scans. Use it for recurrence history, ownership, comments,
                and verification context. Use the scan view when you need to clear blockers from one specific upload.
              </p>
              {group.last_seen_at ? (
                <p className="mt-2 text-xs text-sky-800">
                  Last seen {timeAgo(group.last_seen_at)} in this project. Open the latest scan occurrence when you need the live upload context.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {lastSeenScanHref ? (
                <Link
                  href={lastSeenScanHref}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                >
                  <History className="w-3.5 h-3.5" />
                  Open scan occurrence
                </Link>
              ) : null}
              <Link
                href="/dashboard/exceptions"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Shield className="w-3.5 h-3.5" />
                Exception queue
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  Instances Across Scans
                </h2>
                <span className="text-sm text-slate-500">
                  {group.occurrence_count} total in {affectedFileCount} files
                </span>
              </div>
              {findingsByScan.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No occurrences found</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {findingsByScan.map((finding) => (
                    <div key={finding.id} className="p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-800">{finding.scans?.branch || "Unknown branch"}</span>
                            {finding.scans?.commit_hash ? (
                              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                                {finding.scans.commit_hash.slice(0, 7)}
                              </code>
                            ) : null}
                            <span>{formatDate(finding.scans?.created_at || finding.created_at)}</span>
                            {finding.is_new ? (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">NEW IN THAT SCAN</span>
                            ) : null}
                          </div>
                          <div className="text-sm font-mono text-slate-700 break-all">
                            {finding.file_path}:L{finding.line_number}
                          </div>
                          <p className="text-sm text-slate-600">{finding.message}</p>
                        </div>
                        {finding.scan_id ? (
                          <Link
                            href={`/dashboard/scans/${finding.scan_id}`}
                            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Open scan occurrence
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={`bg-white border ${categoryContext.borderColor} rounded-xl shadow-sm overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${categoryContext.borderColor} ${categoryContext.lightBg}`}>
                <h2 className={`text-lg font-semibold flex items-center gap-2 ${categoryContext.color}`}>
                  <CategoryIcon className="w-5 h-5" />
                  What is this {categoryContext.whatIsThis.toLowerCase()}?
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-slate-700 leading-relaxed">{ruleInfo.description}</p>
                
                <div className={`${categoryContext.bgColor} border ${categoryContext.borderColor} rounded-lg p-4`}>
                  <h3 className={`text-sm font-semibold ${categoryContext.color} mb-2`}>{categoryContext.riskLabel}</h3>
                  <p className="text-sm text-slate-600">{ruleInfo.risk}</p>
                </div>

                {(ruleInfo.cwe || ruleInfo.owasp) && (
                  <div className="flex items-center gap-3 text-xs">
                    {ruleInfo.cwe && (
                      <a href={`https://cwe.mitre.org/data/definitions/${ruleInfo.cwe.replace('CWE-', '')}.html`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded transition">
                        {ruleInfo.cwe}
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )}
                    {ruleInfo.owasp && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded">{ruleInfo.owasp}</span>
                    )}
                  </div>
                )}
              </div>
            </section>

            {orgId && (
              <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Assignment</h3>
                {plan === 'free' ? (
                  <ProFeatureLock feature="Issue Assignment" description="Assign issues to team members for tracking and accountability" />
                ) : (
                  <AssignIssue
                    issueGroupId={group.id}
                    orgId={orgId}
                  />
                )}
              </section>
            )}

            {currentUserId && (
              plan === 'free' ? (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Comments</h3>
                  <ProFeatureLock feature="Team Comments" description="Collaborate on issues with your team" />
                </section>
              ) : (
                <IssueComments
                  issueGroupId={group.id}
                  currentUserId={currentUserId}
                />
              )
            )}
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon={<Eye className="w-4 h-4" />} label="Occurrences" value={group.occurrence_count}
                subtext={`${affectedFileCount || group.affected_files?.length || 0} files`} />
              <StatCard icon={<Zap className="w-4 h-4" />} label="Status"
                value={getIssueGroupStatusLabel(groupStatus)} />
            </div>

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  Exception governance
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {plan === 'free' ? (
                  <ProFeatureLock feature="Exception Governance" description="Route recurring issue suppressions through reviewer approval and keep a decision trail." />
                ) : latestException ? (
                  <>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest request</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {getExceptionStatusLabel(latestException.effective_status)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Requested {formatDate(latestException.requested_at)}
                        {latestException.expires_at ? ` · Expires ${formatDate(latestException.expires_at)}` : ' · No expiry'}
                      </div>
                      <p className="mt-1 text-sm text-slate-600 line-clamp-3">{latestException.justification}</p>
                    </div>
                    <Link
                      href={`/dashboard/exceptions/${latestException.id}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Open decision trail
                    </Link>
                    {canRequestAnotherException ? (
                      <button
                        type="button"
                        onClick={openExceptionModal}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Request another exception
                      </button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">
                      Request a human-reviewed exception for this recurring issue. Approved requests materialize into suppressions and keep a decision trail for audits.
                    </p>
                    <button
                      type="button"
                      onClick={openExceptionModal}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Request exception
                    </button>
                  </>
                )}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  Timeline
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Last Seen</div>
                    <div className="text-xs text-slate-500">{formatDate(group.last_seen_at)}</div>
                    <div className="text-xs text-slate-400">{timeAgo(group.last_seen_at)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">First Seen</div>
                    <div className="text-xs text-slate-500">{formatDate(group.first_seen_at)}</div>
                    <div className="text-xs text-slate-400">{timeAgo(group.first_seen_at)}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-slate-400" />
                  Project
                </h3>
              </div>
              <div className="p-4">
                <div className="text-sm font-medium text-slate-900 mb-1">{project?.name || 'Loading...'}</div>
                {project?.repo_url && (
                  <a href={project.repo_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-gray-700 hover:text-indigo-700 flex items-center gap-1">
                    {project.repo_url.replace('https://github.com/', '')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className="mt-2">
                  <Link
                    href={`/dashboard/projects/${group.project_id}`}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Open project overview
                  </Link>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-slate-400" />
                  Primary Location
                </h3>
              </div>
              <div className="p-4">
                <div className="text-sm font-mono text-slate-700 break-all mb-1">{group.canonical_file}</div>
                <div className="text-xs text-slate-500">Line {group.canonical_line}</div>
              </div>
            </section>

            {group.verification_status && (
              <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    Verification
                  </h3>
                </div>
                <div className="p-4">
                  <VerificationBadge status={group.verification_status} />
                  {group.verification_status === 'VERIFIED' && (
                    <p className="text-xs text-slate-500 mt-2">
                      This vulnerability has been verified as exploitable through automated analysis.
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {exceptionOpen && (
        <div className="fixed inset-0 z-[95]">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isSubmittingException && setExceptionOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-start gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900">Request exception</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Send this recurring issue to a reviewer instead of suppressing it immediately.
                  </div>
                </div>
                <button onClick={() => setExceptionOpen(false)} className="ml-auto p-2 rounded-lg hover:bg-slate-50">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 font-mono">
                  {group.rule_id} :: {group.canonical_file}:{group.canonical_line}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Justification</label>
                  <textarea
                    value={exceptionJustification}
                    onChange={(e) => setExceptionJustification(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                    placeholder="Why should this issue be allowed for now?"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Expiry</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      ['7', '7 days'],
                      ['30', '30 days'],
                      ['90', '90 days'],
                      ['NEVER', 'No expiry'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setExceptionExpiry(value as 'NEVER' | '7' | '30' | '90')}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          exceptionExpiry === value
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Expiry is applied to the exception and to any suppressions materialized from approval.
                  </p>
                </div>
                {exceptionError ? <div className="text-sm text-rose-600">{exceptionError}</div> : null}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setExceptionOpen(false)} disabled={isSubmittingException} className="px-3 py-2 rounded-lg text-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                  <button onClick={submitExceptionRequest} disabled={isSubmittingException || exceptionJustification.trim().length < 8} className="px-3 py-2 rounded-lg text-sm bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
                    {isSubmittingException ? "Submitting..." : "Send for review"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
