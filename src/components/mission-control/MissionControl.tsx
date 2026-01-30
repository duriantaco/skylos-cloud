'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { 
  Shield, AlertTriangle, ChevronRight, Search, 
  Filter, CheckCircle2, Clock, FileCode, Eye,
  Layers, TrendingDown, Zap, Key, Trash2, Bug
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type IssueGroup = {
  id: string;
  rule_id: string;
  category: string;
  severity: string;
  canonical_file: string | null;
  canonical_line: number | null;
  occurrence_count: number;
  affected_files: string[] | null;
  verification_status: string | null;
  status: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  projects?: { name: string } | null;
};

type FilterSeverity = 'all' | 'critical' | 'high' | 'medium' | 'low';
type FilterStatus = 'open' | 'resolved' | 'all';
type SortOption = 'severity' | 'recent' | 'occurrences';

// ============================================================================
// HELPERS
// ============================================================================

function timeAgo(dateString: string | null) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatRuleName(ruleId: string): string {
  return ruleId
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function sevRank(sev: string) {
  const s = String(sev || '').toUpperCase();
  if (s === 'CRITICAL') return 4;
  if (s === 'HIGH') return 3;
  if (s === 'MEDIUM') return 2;
  return 1;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function SeverityBadge({ severity }: { severity: string }) {
  const s = (severity || 'UNKNOWN').toUpperCase();
  const styles: Record<string, string> = {
    CRITICAL: 'bg-rose-100 text-rose-700 ring-rose-600/20',
    HIGH: 'bg-orange-100 text-orange-700 ring-orange-600/20',
    MEDIUM: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    LOW: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ring-1 ring-inset ${styles[s] || 'bg-slate-100 text-slate-600 ring-slate-500/20'}`}>
      {s}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const c = (category || 'UNKNOWN').toUpperCase();
  const config: Record<string, { icon: any; color: string; bg: string }> = {
    SECURITY: { icon: Shield, color: 'text-rose-600', bg: 'bg-rose-50' },
    SECRET: { icon: Key, color: 'text-purple-600', bg: 'bg-purple-50' },
    QUALITY: { icon: Bug, color: 'text-blue-600', bg: 'bg-blue-50' },
    DEAD_CODE: { icon: Trash2, color: 'text-slate-500', bg: 'bg-slate-50' },
  };
  const { icon: Icon, color, bg } = config[c] || config.QUALITY;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <Icon className="w-3 h-3" />
      {c.replace('_', ' ')}
    </span>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color = 'slate',
  onClick,
  active
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number;
  color?: 'rose' | 'orange' | 'amber' | 'slate' | 'blue';
  onClick?: () => void;
  active?: boolean;
}) {
  const colorStyles = {
    rose: active 
      ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-500/20' 
      : 'bg-white border-slate-200 hover:border-rose-200 hover:bg-rose-50/50',
    orange: active 
      ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-500/20' 
      : 'bg-white border-slate-200 hover:border-orange-200 hover:bg-orange-50/50',
    amber: active 
      ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-500/20' 
      : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/50',
    blue: active 
      ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20' 
      : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/50',
    slate: active 
      ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-500/20' 
      : 'bg-white border-slate-200 hover:border-slate-300',
  };

  const textColors = {
    rose: 'text-rose-600',
    orange: 'text-orange-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    slate: 'text-slate-600',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-xl p-4 border shadow-sm transition cursor-pointer text-left ${colorStyles[color]}`}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold ${active ? textColors[color] : 'text-slate-900'}`}>
        {value}
      </div>
    </button>
  );
}

function IssueRow({ group }: { group: IssueGroup }) {
  return (
    <Link
      href={`/dashboard/issues/${group.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-md transition group"
    >
      <div className="flex items-start gap-4">
        {/* Severity badge */}
        <div className="pt-0.5">
          <SeverityBadge severity={group.severity} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition truncate">
              {formatRuleName(group.rule_id)}
            </span>
            {group.verification_status === 'VERIFIED' && (
              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                VERIFIED
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
            <CategoryBadge category={group.category} />
            <span className="text-slate-300">•</span>
            <span className="truncate max-w-[200px] font-mono">{group.canonical_file}</span>
            {group.canonical_line && <span>:{group.canonical_line}</span>}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {group.occurrence_count} occurrences
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(group.last_seen_at)}
            </span>
            {group.projects?.name && (
              <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium">
                {group.projects.name}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="pt-2">
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MissionControl({ orgId }: { orgId: string }) {
  const [groups, setGroups] = useState<IssueGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('open');
  const [sortBy, setSortBy] = useState<SortOption>('severity');

  useEffect(() => {
    loadIssues();
  }, [orgId, filterStatus]);

  async function loadIssues() {
    setLoading(true);
    const supabase = createClient();
    
    let query = supabase
      .from('issue_groups')
      .select('*, projects(name)')
      .eq('org_id', orgId)
      .order('last_seen_at', { ascending: false })
      .limit(200);
    
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }
    
    const { data } = await query;
    setGroups(data || []);
    setLoading(false);
  }

  // Filter and sort
  const filteredGroups = groups
    .filter(g => {
      if (search) {
        const s = search.toLowerCase();
        if (!g.rule_id.toLowerCase().includes(s) && 
            !g.canonical_file?.toLowerCase().includes(s) &&
            !g.category.toLowerCase().includes(s)) {
          return false;
        }
      }
      if (filterSeverity !== 'all') {
        if (filterSeverity === 'critical' && g.severity !== 'CRITICAL') return false;
        if (filterSeverity === 'high' && !['CRITICAL', 'HIGH'].includes(g.severity)) return false;
        if (filterSeverity === 'medium' && !['CRITICAL', 'HIGH', 'MEDIUM'].includes(g.severity)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'severity') {
        const diff = sevRank(b.severity) - sevRank(a.severity);
        if (diff !== 0) return diff;
        return (b.occurrence_count || 0) - (a.occurrence_count || 0);
      }
      if (sortBy === 'occurrences') {
        return (b.occurrence_count || 0) - (a.occurrence_count || 0);
      }
      return new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime();
    });

  // Stats
  const stats = {
    total: groups.length,
    critical: groups.filter(g => g.severity === 'CRITICAL').length,
    high: groups.filter(g => g.severity === 'HIGH').length,
    medium: groups.filter(g => g.severity === 'MEDIUM').length,
    low: groups.filter(g => g.severity === 'LOW').length,
    totalOccurrences: groups.reduce((sum, g) => sum + (g.occurrence_count || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                <Layers className="w-6 h-6 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Mission Control</h1>
            </div>
            <p className="text-slate-500 text-sm">
              <span className="font-semibold text-slate-700">{stats.totalOccurrences}</span> total findings grouped into{' '}
              <span className="font-semibold text-slate-700">{stats.total}</span> unique issues
            </p>
          </div>

          {/* Status toggle */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setFilterStatus('open')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                filterStatus === 'open' 
                  ? 'bg-slate-900 text-white' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setFilterStatus('resolved')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                filterStatus === 'resolved' 
                  ? 'bg-slate-900 text-white' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Resolved
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                filterStatus === 'all' 
                  ? 'bg-slate-900 text-white' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              All
            </button>
          </div>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            icon={<Zap className="w-4 h-4" />}
            label="Critical"
            value={stats.critical}
            color="rose"
            onClick={() => setFilterSeverity(filterSeverity === 'critical' ? 'all' : 'critical')}
            active={filterSeverity === 'critical'}
          />
          <StatCard
            icon={<AlertTriangle className="w-4 h-4" />}
            label="High"
            value={stats.high}
            color="orange"
            onClick={() => setFilterSeverity(filterSeverity === 'high' ? 'all' : 'high')}
            active={filterSeverity === 'high'}
          />
          <StatCard
            icon={<Shield className="w-4 h-4" />}
            label="Medium"
            value={stats.medium}
            color="amber"
            onClick={() => setFilterSeverity(filterSeverity === 'medium' ? 'all' : 'medium')}
            active={filterSeverity === 'medium'}
          />
          <StatCard
            icon={<TrendingDown className="w-4 h-4" />}
            label="Low"
            value={stats.low}
            color="blue"
            onClick={() => setFilterSeverity(filterSeverity === 'low' ? 'all' : 'low')}
            active={filterSeverity === 'low'}
          />
          <StatCard
            icon={<Layers className="w-4 h-4" />}
            label="Total"
            value={stats.total}
            color="slate"
            onClick={() => setFilterSeverity('all')}
            active={filterSeverity === 'all'}
          />
        </div>

        {/* Search and filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by rule, file, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="severity">Sort by Severity</option>
                <option value="occurrences">Sort by Occurrences</option>
                <option value="recent">Sort by Recent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Issue list */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
              <div className="animate-spin w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full mx-auto mb-4" />
              <p className="text-slate-500">Loading issues...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                {search || filterSeverity !== 'all' ? 'No matching issues' : 'All Clear! 🎉'}
              </h2>
              <p className="text-slate-500">
                {search || filterSeverity !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'No open issues to triage right now.'}
              </p>
            </div>
          ) : (
            <>
              <div className="text-xs text-slate-500 px-1">
                Showing {filteredGroups.length} of {groups.length} issues
              </div>
              {filteredGroups.map(group => (
                <IssueRow key={group.id} group={group} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}