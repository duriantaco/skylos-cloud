'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import {
  ArrowLeft, ExternalLink, CheckCircle, XCircle,
  GitCommit, FileCode, Shield, Eye, History,
  ChevronRight, Copy, Check, Sparkles, Ban, GitPullRequest,
  Layers, Code2, ArrowUpRight, Trash2, Bug,
  Key, Zap, Loader2
} from 'lucide-react';
import IssueComments from '@/components/IssueComments';
import AssignIssue from '@/components/AssignIssue';
import FlowVisualizerButton from '@/components/FlowVisualizerButton';


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
  data_flow: any | null;
  status: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  last_seen_scan_id: string | null;
  project_id: string;
};

type Finding = {
  id: string;
  file_path: string;
  line_number: number;
  message: string;
  snippet: string | null;
  is_new: boolean;
  created_at: string;
};

type Project = {
  name: string;
  repo_url: string | null;
  github_installation_id: number | null;
};

const CATEGORY_CONTEXT: Record<string, {
  icon: any;
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

function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', go: 'go', rs: 'rust', java: 'java', rb: 'ruby',
    php: 'php', cs: 'csharp', cpp: 'cpp', c: 'c', swift: 'swift',
  };
  return map[ext || ''] || 'plaintext';
}

function getGitHubUrl(repoUrl: string | null, filePath: string, line: number) {
  if (!repoUrl) return null;
  const clean = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
  return `${clean}/blob/main/${filePath}#L${line}`;
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

function CodeBlock({ code, highlightLine, filePath }: { 
  code: string; 
  highlightLine?: number;
  filePath?: string;
}) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
      {filePath && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2 text-sm text-slate-400 font-mono">
            <FileCode className="w-4 h-4" />
            {filePath}
          </div>
          <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <pre className="text-sm">
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const isHighlighted = highlightLine === lineNum;
            return (
              <div key={i} className={`flex ${isHighlighted ? 'bg-rose-500/20 border-l-2 border-rose-500' : 'border-l-2 border-transparent'}`}>
                <span className={`select-none px-4 py-0.5 text-right w-12 ${isHighlighted ? 'text-rose-400' : 'text-slate-600'}`}>
                  {lineNum}
                </span>
                <code className={`flex-1 px-4 py-0.5 ${isHighlighted ? 'text-rose-100' : 'text-slate-300'}`}>
                  {line || ' '}
                </code>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

export default function IssueDetailClient({ group }: { group: IssueGroup }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [prResult, setPrResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

  const ruleInfo = getRuleInfo(group.rule_id, group.category);
  const categoryContext = getCategoryContext(group.category);
  const CategoryIcon = categoryContext.icon;

  useEffect(() => {
    async function loadProject() {
      const supabase = createClient();
      const { data } = await supabase
        .from('projects')
        .select('name, repo_url, github_installation_id, org_id')
        .eq('id', group.project_id)
        .single();
      if (data) {
        setProject(data);
        setOrgId((data as any).org_id);
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
        .select('id, file_path, line_number, message, snippet, is_new, created_at')
        .eq('group_id', group.id)
        .order('file_path')
        .limit(100);
      setFindings(data || []);
    }
    loadFindings();
  }, [group.id]);

  useEffect(() => {
    async function loadFile() {
      if (!group.last_seen_scan_id) 
        return;
      setLoadingFile(true);
      try {
        const res = await fetch(`/api/scans/${group.last_seen_scan_id}/file?path=${encodeURIComponent(group.canonical_file)}`);
        if (res.ok) {
          const data = await res.json();
          setFileContent(data.content);
        }
      } finally {
        setLoadingFile(false);
      }
    }
    loadFile();
  }, [group.last_seen_scan_id, group.canonical_file]);

  const githubUrl = getGitHubUrl(project?.repo_url || null, group.canonical_file, group.canonical_line);
  const canCreatePR = project?.github_installation_id && findings.length > 0;

  const findingsByFile = findings.reduce((acc, f) => {
    if (!acc[f.file_path]) acc[f.file_path] = [];
    acc[f.file_path].push(f);
    return acc;
  }, {} as Record<string, Finding[]>);

  async function handleCreateFixPR() {
    if (!findings.length) 
      return;
    setIsCreatingPR(true);
    setPrResult(null);
    try {
      const findingId = findings[0].id;
      const res = await fetch(`/api/findings/${findingId}/fix`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setPrResult({ success: true, url: data.pr_url });
      } else {
        setPrResult({ success: false, error: data.error || 'Failed to create PR' });
      }
    } catch (err: any) {
      setPrResult({ success: false, error: err.message || 'Network error' });
    } finally {
      setIsCreatingPR(false);
    }
  }

  async function handleMarkFalsePositive() {
    setIsActioning(true);
    try {
      const response = await fetch(`/api/issue-groups/${group.id}/suppress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'False Positive',
          expires_at: null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark as false positive');
      }

      window.location.reload();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsActioning(false);
    }
  }

  async function handleSuppress() {
    setIsActioning(true);
    try {
      const reason = prompt('Reason for suppression (optional):');
      if (reason === null) {
        setIsActioning(false);
        return;
      }

      const expiryDays = prompt('Suppress for how many days? (leave empty for permanent):');
      let expires_at: string | null = null;

      if (expiryDays && expiryDays.trim()) {
        const days = parseInt(expiryDays.trim());
        if (!isNaN(days) && days > 0) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + days);
          expires_at = expiryDate.toISOString();
        }
      }

      const response = await fetch(`/api/issue-groups/${group.id}/suppress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim() || null,
          expires_at
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to suppress issue');
      }

      window.location.reload();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsActioning(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link href="/dashboard/issues" className="hover:text-slate-900 transition flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Mission Control
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
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {findings.length > 0 && (
                <FlowVisualizerButton
                  findingId={findings[0].id}
                  ruleId={group.rule_id}
                  category={group.category}
                  repoUrl={project?.repo_url || undefined}
                />
              )}
              {githubUrl && (
                <a href={githubUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition shadow-sm">
                  <ExternalLink className="w-4 h-4" />
                  View on GitHub
                </a>
              )}
              <button onClick={handleMarkFalsePositive} disabled={isActioning}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition shadow-sm disabled:opacity-50">
                <XCircle className="w-4 h-4" />
                False Positive
              </button>
              <button onClick={handleSuppress} disabled={isActioning}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition shadow-sm disabled:opacity-50">
                <Ban className="w-4 h-4" />
                Suppress
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
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

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-gray-700" />
                  {group.category === 'DEAD_CODE' ? 'Unused Code' : 'Flagged Code'}
                </h2>
                <span className="text-sm text-slate-500">Line {group.canonical_line}</span>
              </div>
              <div className="p-4">
                {loadingFile ? (
                  <div className="text-center py-8 text-slate-500">Loading file...</div>
                ) : (
                  <CodeBlock
                    code={fileContent || group.canonical_snippet || '// No code available'}
                    highlightLine={group.canonical_line}
                    filePath={group.canonical_file}
                  />
                )}
              </div>
            </section>

            {(group.category === 'SECURITY' || group.category === 'SECRET') && findings.length > 0 && (
              <section className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Data Flow Analysis</h2>
                      <p className="text-sm text-slate-600">
                        Trace how untrusted data flows from source to sink in this vulnerability
                      </p>
                    </div>
                  </div>
                  <FlowVisualizerButton
                    findingId={findings[0].id}
                    ruleId={group.rule_id}
                    category={group.category}
                    repoUrl={project?.repo_url || undefined}
                  />
                </div>
              </section>
            )}

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  How to Fix
                </h2>
                
                {canCreatePR && (
                  <button onClick={handleCreateFixPR} disabled={isCreatingPR}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 shadow-sm">
                    {isCreatingPR ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Creating PR...</>
                    ) : (
                      <><GitPullRequest className="w-4 h-4" />Create Fix PR</>
                    )}
                  </button>
                )}
              </div>
              <div className="p-6">
                {prResult && (
                  <div className={`mb-4 p-4 rounded-lg ${prResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                    {prResult.success ? (
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <div>
                          <div className="text-sm font-medium text-emerald-700">Pull Request Created!</div>
                          <a href={prResult.url} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
                            View PR on GitHub<ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-rose-600" />
                        <div>
                          <div className="text-sm font-medium text-rose-700">Failed to create PR</div>
                          <div className="text-sm text-rose-600">{prResult.error}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-slate-700 leading-relaxed">{ruleInfo.remediation}</p>

                {group.suggested_fix && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                      <Sparkles className="w-4 h-4" />
                      AI-Suggested Fix Available
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-slate-500 mb-2">BEFORE</div>
                        <pre className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-800 overflow-x-auto">
                          {group.suggested_fix.before}
                        </pre>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-500 mb-2">AFTER</div>
                        <pre className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800 overflow-x-auto">
                          {group.suggested_fix.after}
                        </pre>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">{group.suggested_fix.explanation}</p>
                  </div>
                )}

                {!canCreatePR && project && !project.github_installation_id && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-sm text-slate-600">
                      <strong className="text-slate-900">Want automatic fix PRs?</strong>
                      {' '}Install the Skylos GitHub App to enable one-click fixes.
                    </div>
                    <Link href="/dashboard/settings/github"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-gray-700 hover:text-indigo-700 font-medium">
                      Install GitHub App<ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* All occurrences */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  All Occurrences
                </h2>
                <span className="text-sm text-slate-500">
                  {group.occurrence_count} total in {Object.keys(findingsByFile).length} files
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {Object.entries(findingsByFile).map(([filePath, fileFindings]) => (
                  <div key={filePath} className="p-4">
                    <div className="flex items-center gap-2 text-sm font-mono text-slate-700 mb-3">
                      <FileCode className="w-4 h-4 text-slate-400" />
                      {filePath}
                      <span className="text-xs text-slate-400">({fileFindings.length})</span>
                    </div>
                    <div className="space-y-2 pl-6">
                      {fileFindings.map(f => (
                        <div key={f.id} className="flex items-center gap-3 text-sm group">
                          <span className="text-slate-400 font-mono w-12">L{f.line_number}</span>
                          <span className="text-slate-600 truncate flex-1">{f.message}</span>
                          {f.is_new && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">NEW</span>
                          )}
                          {project?.repo_url && (
                            <a href={getGitHubUrl(project.repo_url, f.file_path, f.line_number) || '#'}
                              target="_blank" rel="noopener noreferrer"
                              className="text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {findings.length === 0 && (
                  <div className="p-8 text-center text-slate-500">No occurrences found</div>
                )}
              </div>
            </section>

            {orgId && (
              <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Assignment</h3>
                <AssignIssue
                  issueGroupId={group.id}
                  orgId={orgId}
                />
              </section>
            )}

            {currentUserId && (
              <IssueComments
                issueGroupId={group.id}
                currentUserId={currentUserId}
              />
            )}
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon={<Eye className="w-4 h-4" />} label="Occurrences" value={group.occurrence_count}
                subtext={`${group.affected_files?.length || 0} files`} />
              <StatCard icon={<Zap className="w-4 h-4" />} label="Status"
                value={group.status === 'open' ? 'Open' : 'Resolved'} />
            </div>

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
                {project?.github_installation_id && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle className="w-3 h-3" />
                    GitHub App Connected
                  </div>
                )}
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
    </div>
  );
}