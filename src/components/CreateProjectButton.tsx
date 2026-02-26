'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, X, FolderPlus, Github, Copy, Check, AlertTriangle, Key } from 'lucide-react'

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

  // Post-creation state
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const normalizedUrl = normalizeGitHubUrl(repoUrl);
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

      // Show the API key — this is the only time it's visible
      setCreatedApiKey(data.api_key)
      setLoading(false)
    } catch (e) {
      setError('Failed to create project')
      setLoading(false)
    }
  }

  const handleCopyKey = () => {
    if (!createdApiKey) return
    navigator.clipboard.writeText(createdApiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDone = () => {
    setIsOpen(false)
    setName('')
    setRepoUrl('')
    setError('')
    setCreatedApiKey(null)
    setCopied(false)
    router.refresh()
  }

  const handleClose = () => {
    if (loading) return
    if (createdApiKey) {
      // Don't allow casual close — force them through "Done"
      return
    }
    setIsOpen(false)
    setName('')
    setRepoUrl('')
    setError('')
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
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {createdApiKey ? (
              /* ── API Key Reveal Screen ── */
              <>
                <div className="bg-emerald-600 px-6 py-6 text-center">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Key className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Project Created!</h2>
                  <p className="text-emerald-100 text-sm mt-1">Save your API key now</p>
                </div>

                <div className="p-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800 font-medium">
                      This key will only be shown once. Copy it now — you won't be able to see it again.
                    </p>
                  </div>

                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Your API Key
                  </label>
                  <div className="bg-slate-900 rounded-lg p-3 flex items-center gap-3">
                    <code className="flex-1 text-sm text-emerald-400 font-mono break-all select-all">
                      {createdApiKey}
                    </code>
                    <button
                      onClick={handleCopyKey}
                      className="flex-shrink-0 p-2 rounded-md bg-white/10 hover:bg-white/20 transition"
                      title="Copy"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>

                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Quick start:</p>
                    <div className="bg-white border border-slate-200 rounded-md p-2.5 font-mono text-xs text-slate-600 break-all">
                      SKYLOS_TOKEN={createdApiKey} skylos . --upload
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Or set <code className="bg-slate-100 px-1 rounded">SKYLOS_TOKEN</code> in your CI/CD environment.
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <button
                    onClick={handleDone}
                    className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition"
                  >
                    {copied ? "Done" : "I've saved my key — Continue"}
                  </button>
                </div>
              </>
            ) : (
              /* ── Create Project Form ── */
              <>
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

                <div className="p-6 space-y-4">
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
                        Will be saved as: <code className="bg-emerald-50 px-1 rounded">{normalizedUrl}</code>
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
