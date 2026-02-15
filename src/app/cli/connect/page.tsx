'use client'

import { createClient } from '@/utils/supabase/client'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Loader2, Plus, FolderOpen, Check, Terminal } from 'lucide-react'

function ConnectFlow() {
  const searchParams = useSearchParams()
  const port = searchParams.get('port')
  const repoName = searchParams.get('repo') || ''
  const repoUrl = searchParams.get('repo_url') || ''

  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<any[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState(repoName)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const currentUrl = `/cli/connect?${searchParams.toString()}`
      await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(currentUrl)}`,
        },
      })
      return
    }

    setUser(user)
    await loadData()
    setLoading(false)
  }

  async function loadData() {
    const [projectsRes, orgRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/cli/org'),
    ])
    const projectsData = await projectsRes.json()
    const orgData = await orgRes.json()
    setProjects(projectsData.projects || [])
    setOrgId(orgData.org_id || null)
  }

  async function selectProject(projectId: string) {
    setConnecting(projectId)
    setError('')

    try {
      const res = await fetch('/api/cli/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      })

      const data = await res.json()

      if (!res.ok || !data.token) {
        setError(data.error || 'Failed to get API key')
        setConnecting(null)
        return
      }

      redirectToCli(data)
    } catch {
      setError('Connection failed. Is the CLI still running?')
      setConnecting(null)
    }
  }

  async function createAndConnect() {
    if (!newProjectName.trim() || !orgId) return
    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          name: newProjectName.trim(),
          repo_url: repoUrl || null,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.project) {
        setError(data.error || 'Failed to create project')
        setCreating(false)
        return
      }

      const project = data.project

      redirectToCli({
        token: project.api_key,
        project_id: project.id,
        project_name: project.name,
        org_name: '',
        plan: 'free',
      })
    } catch {
      setError('Failed to create project')
      setCreating(false)
    }
  }

  function redirectToCli(data: {
    token: string
    project_id: string
    project_name: string
    org_name: string
    plan: string
  }) {
    setDone(true)
    const callbackUrl = new URL(`http://localhost:${port}/callback`)
    callbackUrl.searchParams.set('token', data.token)
    callbackUrl.searchParams.set('project_id', data.project_id)
    callbackUrl.searchParams.set('project_name', data.project_name)
    callbackUrl.searchParams.set('org_name', data.org_name)
    callbackUrl.searchParams.set('plan', data.plan)
    window.location.href = callbackUrl.toString()
  }

  if (!port) {
    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-4">
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-white mb-2">Invalid Request</h2>
          <p className="text-slate-400 text-sm">
            This page should be opened from the Skylos CLI.
            Run <code className="bg-white/10 px-2 py-0.5 rounded">skylos login</code> in your terminal.
          </p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-4">
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connected!</h2>
          <p className="text-slate-400 text-sm">
            Return to your terminal. You can close this tab.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-4">
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Authenticating...</p>
        </div>
      </div>
    )
  }

  const hasProjects = projects.length > 0

  return (
    <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/5 rounded-lg">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Connect to Skylos CLI</h1>
            <p className="text-slate-400 text-sm">
              {repoName
                ? <>Select a project for <code className="text-white">{repoName}</code></>
                : 'Select a project to connect'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Create new project */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-300 block mb-2">
            {hasProjects ? 'Create new project' : 'Create a project'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-white/30"
              autoFocus={!hasProjects}
              onKeyDown={(e) => e.key === 'Enter' && createAndConnect()}
            />
            <button
              onClick={createAndConnect}
              disabled={creating || !newProjectName.trim()}
              className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create & Connect
            </button>
          </div>
          {repoUrl && (
            <p className="text-xs text-slate-500 mt-1.5">
              Repo: {repoUrl}
            </p>
          )}
        </div>

        {/* Existing projects */}
        {hasProjects && (
          <>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[#0A0A0A] text-slate-500">or connect to existing</span>
              </div>
            </div>

            <div className="space-y-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProject(p.id)}
                  disabled={!!connecting}
                  className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-4 h-4 text-slate-400" />
                    <span className="text-white text-sm font-medium">{p.name}</span>
                  </div>
                  {connecting === p.id ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <span className="text-xs text-slate-500">Connect</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function CliConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      }
    >
      <ConnectFlow />
    </Suspense>
  )
}
