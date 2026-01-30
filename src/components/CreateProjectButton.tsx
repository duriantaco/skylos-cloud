'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, X, FolderPlus, Github } from 'lucide-react'

function normalizeGitHubUrl(url: string): string | null {
  if (!url.trim()) return null;
  
  let normalized = url.trim();
  
  if (normalized.startsWith('git@github.com:')) {
    normalized = normalized.replace('git@github.com:', 'https://github.com/');
  }
  
  if (normalized.startsWith('ssh://git@github.com/')) {
    normalized = normalized.replace('ssh://git@github.com/', 'https://github.com/');
  }
  
  if (!normalized.startsWith('https://') && !normalized.startsWith('http://')) {
    if (normalized.startsWith('github.com')) {
      normalized = 'https://' + normalized;
    }
  }
  
  normalized = normalized.replace(/\.git$/, '');
  normalized = normalized.replace(/\/$/, '');
  
  const match = normalized.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)$/);
  if (!match) return null;
  
  return normalized;
}

function extractRepoInfo(url: string): { owner: string; repo: string } | null {
  const normalized = normalizeGitHubUrl(url);
  if (!normalized) return null;
  
  const match = normalized.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)$/);
  if (!match) return null;
  
  return { owner: match[1], repo: match[2] };
}

export default function CreateProjectButton({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const normalizedUrl = normalizeGitHubUrl(repoUrl);
  const repoInfo = extractRepoInfo(repoUrl);
  const isValidUrl = !!normalizedUrl;

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    if (!normalizedUrl) {
      setError('Valid GitHub repository URL is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          name: name.trim(),
          repo_url: normalizedUrl,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create project')
        setLoading(false)
        return
      }

      setIsOpen(false)
      setName('')
      setRepoUrl('')
      setLoading(false)
      router.refresh()
    } catch (e) {
      setError('Failed to create project')
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setIsOpen(false)
      setName('')
      setRepoUrl('')
      setError('')
    }
  }

  const handleRepoUrlChange = (url: string) => {
    setRepoUrl(url);
    
    if (!name.trim()) {
      const info = extractRepoInfo(url);
      if (info) {
        setName(info.repo);
      }
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        New Project
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <FolderPlus className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">New Project</h2>
                  <p className="text-sm text-slate-500">Add a GitHub repository to scan</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Repo URL first - it auto-fills name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    Repository URL <span className="text-red-500">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => handleRepoUrlChange(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className={`w-full px-4 py-3 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                    repoUrl && !isValidUrl 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : repoUrl && isValidUrl
                      ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500'
                      : 'border-slate-200 focus:ring-slate-900 focus:border-slate-900'
                  }`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) handleCreate()
                  }}
                />
                {repoUrl && isValidUrl && (
                  <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                    ✓ Will be saved as: <code className="bg-emerald-50 px-1 rounded">{normalizedUrl}</code>
                  </p>
                )}
                {repoUrl && !isValidUrl && (
                  <p className="mt-2 text-xs text-red-500">
                    Enter a valid GitHub URL (e.g., https://github.com/owner/repo)
                  </p>
                )}
                {!repoUrl && (
                  <p className="mt-2 text-xs text-slate-500">
                    Required for GitHub integration and PR blocking
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Backend API"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) handleCreate()
                  }}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !name.trim() || !isValidUrl}
                className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}