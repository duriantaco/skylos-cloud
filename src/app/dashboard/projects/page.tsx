'use client'

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { 
  ArrowLeft, ArrowRight, Search, CheckCircle, XCircle, 
  Clock, GitBranch, ChevronDown, LayoutGrid, LayoutList, 
  FolderOpen, RefreshCw, Trash2, Square, CheckSquare, X
} from "lucide-react";
import CreateProjectButton from "@/components/CreateProjectButton";
import CreateWorkspaceModal from "@/components/CreateWorkspaceModal";
import dogImg from "../../../../public/assets/favicon-96x96.png";
import ConfirmModal from "@/components/ConfirmModal";

type Project = {
  id: string;
  name: string;
  repo_url: string;
  created_at: string;
  org_id: string;
  scans: {
    id: string;
    created_at: string;
    branch: string;
    quality_gate_passed: boolean;
    stats: {
      danger_count?: number;
      new_issues?: number;
      legacy_issues?: number;
    };
  }[];
};

type SortOption = "name" | "recent" | "issues" | "created";
type FilterStatus = "all" | "passing" | "failing" | "no-scans";
type ViewMode = "list" | "grid";

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function ProjectCard({ 
  project, 
  view, 
  isSelected, 
  onToggleSelect,
  selectionMode 
}: { 
  project: Project; 
  view: ViewMode;
  isSelected: boolean;
  onToggleSelect: () => void;
  selectionMode: boolean;
}) {
  const scans = (project.scans || []).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latestScan = scans[0];
  const criticals = latestScan?.stats?.danger_count || 0;
  const newIssues = latestScan?.stats?.new_issues || 0;
  const passed = latestScan?.quality_gate_passed;
  const totalScans = scans.length;

  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode) {
      e.preventDefault();
      onToggleSelect();
    }
  };

  const SelectBox = () => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleSelect();
      }}
      className={`p-1.5 rounded-lg transition ${
        isSelected 
          ? 'bg-indigo-100 text-gray-700' 
          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
      }`}
    >
      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
    </button>
  );

  if (view === "grid") {
    return (
      <div 
        onClick={handleClick}
        className={`group bg-white border rounded-xl p-5 transition-all cursor-pointer ${
          isSelected 
            ? 'border-indigo-300 ring-2 ring-indigo-100' 
            : 'border-slate-200 hover:border-slate-300 hover:shadow-lg'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            !latestScan ? 'bg-slate-100' : passed ? 'bg-emerald-50' : 'bg-red-50'
          }`}>
            {!latestScan ? (
              <Clock className="w-5 h-5 text-slate-400" />
            ) : passed ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
          <SelectBox />
        </div>

        <Link href={selectionMode ? '#' : `/dashboard/projects/${project.id}`}>
          <h3 className="font-semibold text-slate-900 mb-1 truncate group-hover:text-slate-700">
            {project.name}
          </h3>
        </Link>
        
        {latestScan?.branch && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
            <GitBranch className="w-3 h-3" />
            <span className="truncate">{latestScan.branch}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {latestScan ? timeAgo(latestScan.created_at) : "No scans"}
          </div>
          <div className="flex items-center gap-2">
            {criticals > 0 && (
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {criticals} critical
              </span>
            )}
            {criticals === 0 && latestScan && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Clean
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div 
      onClick={handleClick}
      className={`group bg-white border rounded-xl p-4 transition-all flex items-center gap-4 cursor-pointer ${
        isSelected 
          ? 'border-indigo-300 ring-2 ring-indigo-100' 
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <SelectBox />
      
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
        !latestScan ? 'bg-slate-100' : passed ? 'bg-emerald-50' : 'bg-red-50'
      }`}>
        {!latestScan ? (
          <Clock className="w-5 h-5 text-slate-400" />
        ) : passed ? (
          <CheckCircle className="w-5 h-5 text-emerald-600" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600" />
        )}
      </div>

      <Link href={selectionMode ? '#' : `/dashboard/projects/${project.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-semibold text-slate-900 truncate group-hover:text-slate-700">
            {project.name}
          </h3>
          {latestScan?.branch && (
            <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
              <GitBranch className="w-3 h-3" />
              {latestScan.branch}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{latestScan ? `Last scan ${timeAgo(latestScan.created_at)}` : "No scans yet"}</span>
          <span className="text-slate-300">•</span>
          <span>{totalScans} scan{totalScans !== 1 ? 's' : ''}</span>
        </div>
      </Link>

      <div className="flex items-center gap-4 shrink-0">
        {latestScan && (
          <div className="flex items-center gap-3 text-sm">
            {criticals > 0 && (
              <div className="text-center px-3">
                <div className="font-bold text-red-600">{criticals}</div>
                <div className="text-[10px] text-slate-400 uppercase">Critical</div>
              </div>
            )}
            {newIssues > 0 && (
              <div className="text-center px-3">
                <div className="font-bold text-amber-600">{newIssues}</div>
                <div className="text-[10px] text-slate-400 uppercase">New</div>
              </div>
            )}
            {criticals === 0 && newIssues === 0 && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Clean
              </span>
            )}
          </div>
        )}
        {!selectionMode && (
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [view, setView] = useState<ViewMode>("list");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectionMode = selectedIds.size > 0;

  async function loadProjects() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setUser(user);

    const { data: member } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (member?.org_id) {
      setOrgId(member.org_id);

      const { data } = await supabase
        .from("projects")
        .select(`*, scans (id, created_at, branch, quality_gate_passed, stats)`)
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false });

      setProjects(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(term));
    }

    if (filter !== "all") {
      result = result.filter(p => {
        const scans = (p.scans || []).sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const latest = scans[0];

        if (filter === "no-scans") return !latest;
        if (filter === "passing") return latest?.quality_gate_passed === true;
        if (filter === "failing") return latest?.quality_gate_passed === false;
        return true;
      });
    }

    result.sort((a, b) => {
      const aScans = (a.scans || []).sort((x, y) => 
        new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
      );
      const bScans = (b.scans || []).sort((x, y) => 
        new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
      );

      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "recent":
          const aTime = aScans[0]?.created_at || a.created_at;
          const bTime = bScans[0]?.created_at || b.created_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        case "issues":
          const aIssues = aScans[0]?.stats?.danger_count || 0;
          const bIssues = bScans[0]?.stats?.danger_count || 0;
          return bIssues - aIssues;
        case "created":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [projects, search, sort, filter]);

  const counts = useMemo(() => {
    let passing = 0, failing = 0, noScans = 0;
    projects.forEach(p => {
      const scans = (p.scans || []).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latest = scans[0];
      if (!latest) noScans++;
      else if (latest.quality_gate_passed) passing++;
      else failing++;
    });
    return { all: projects.length, passing, failing, noScans };
  }, [projects]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredProjects.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/projects/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      
      if (res.ok) {
        setShowDeleteModal(false);
        setSelectedIds(new Set());
        await loadProjects();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete projects');
      }
    } catch {
      alert('Failed to delete projects');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedProjectNames = projects
    .filter(p => selectedIds.has(p.id))
    .map(p => p.name);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          <span className="text-sm text-slate-500">Loading projects...</span>
        </div>
      </div>
    );
  }

  // No workspace yet — prompt creation
  if (!orgId && user) {
    return (
      <CreateWorkspaceModal userEmail={user.email || ""} userId={user.id} />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Selection toolbar */}
      {selectionMode && (
        <div className="sticky top-16 z-40 bg-gray-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={clearSelection}
                className="p-1.5 hover:bg-gray-500 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="font-medium">
                {selectedIds.size} project{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-sm font-medium hover:bg-gray-500 rounded-lg transition"
              >
                Select all ({filteredProjects.length})
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete selected
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
            <p className="text-slate-500 text-sm mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace
            </p>
          </div>
          {orgId && <CreateProjectButton orgId={orgId} />}
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
              />
            </div>

            {/* Filter & Sort */}
            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterStatus)}
                  className="appearance-none pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                >
                  <option value="all">All ({counts.all})</option>
                  <option value="passing">Passing ({counts.passing})</option>
                  <option value="failing">Failing ({counts.failing})</option>
                  <option value="no-scans">No scans ({counts.noScans})</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="appearance-none pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                >
                  <option value="recent">Recently scanned</option>
                  <option value="name">Name A-Z</option>
                  <option value="issues">Most issues</option>
                  <option value="created">Date created</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* View toggle */}
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setView("list")}
                  className={`p-2.5 transition ${view === "list" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("grid")}
                  className={`p-2.5 transition ${view === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active filters + selection hint */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {search || filter !== "all" 
                  ? `Showing ${filteredProjects.length} of ${projects.length}`
                  : `${filteredProjects.length} projects`
                }
              </span>
              {(search || filter !== "all") && (
                <button
                  onClick={() => { setSearch(""); setFilter("all"); }}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Clear filters
                </button>
              )}
            </div>
            {!selectionMode && filteredProjects.length > 0 && (
              <button
                onClick={selectAll}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Select all to bulk delete
              </button>
            )}
          </div>
        </div>

        {/* Projects */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-xl p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-slate-400" />
            </div>
            {projects.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No projects yet</h3>
                <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                  Connect your first repository to start scanning for security issues.
                </p>
                {orgId && <CreateProjectButton orgId={orgId} />}
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No matching projects</h3>
                <p className="text-slate-500 text-sm mb-4">
                  Try adjusting your search or filters.
                </p>
                <button
                  onClick={() => { setSearch(""); setFilter("all"); }}
                  className="text-sm text-slate-600 hover:text-slate-900 font-medium"
                >
                  Clear all filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={view === "grid" 
            ? "grid md:grid-cols-2 lg:grid-cols-3 gap-4" 
            : "space-y-3"
          }>
            {filteredProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                view={view}
                isSelected={selectedIds.has(project.id)}
                onToggleSelect={() => toggleSelect(project.id)}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk delete modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Projects"
        message={
          <div>
            <p className="mb-3">
              Are you sure you want to delete {selectedIds.size} project{selectedIds.size !== 1 ? 's' : ''}?
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-32 overflow-y-auto">
              <ul className="text-sm text-slate-600 space-y-1">
                {selectedProjectNames.map(name => (
                  <li key={name}>• {name}</li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-sm text-red-600">
              This will permanently delete all scans, findings, and suppressions. This action cannot be undone.
            </p>
          </div>
        }
        confirmText={`Delete ${selectedIds.size} project${selectedIds.size !== 1 ? 's' : ''}`}
        confirmStyle="danger"
        isLoading={isDeleting}
      />
    </main>
  );
}