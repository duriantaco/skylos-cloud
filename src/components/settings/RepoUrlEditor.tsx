'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Github, Check, Loader2, AlertCircle, ExternalLink } from 'lucide-react'

export default function RepoUrlEditor({ 
  projectId, 
  currentUrl 
}: { 
  projectId: string
  currentUrl: string | null 
}) {
  const router = useRouter()
  const [url, setUrl] = useState(currentUrl || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUrl(currentUrl || '')
  }, [currentUrl])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: url.trim() || null }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const message =
          typeof body?.error === 'string'
            ? body.error
            : 'Could not update the repository URL. Try again.'
        setError(message)
        return
      }

      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Could not update the repository URL. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 mb-8">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg">
          <Github className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Repository URL</h2>
          <p className="text-slate-500 text-sm mt-1">
            Optional for basic uploads. Save this card separately when you want PR integration, deep links, or GitHub App setup.
          </p>
        </div>
      </div>

      {currentUrl ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Currently linked</div>
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-900 hover:text-emerald-700"
          >
            {currentUrl}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No GitHub repository linked yet.
        </div>
      )}
      
      <div className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            if (error) setError(null)
          }}
          placeholder="https://github.com/owner/repo"
          className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <button
          onClick={handleSave}
          disabled={saving || url === (currentUrl || '')}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : null}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {saved ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Repository URL saved. Refresh the project page or open Project Overview to confirm the link is visible there.
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-slate-500">
        Leave this blank if you want to keep the project cloud-only and upload scans without GitHub binding.
      </p>
    </div>
  )
}
