'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Github, Check, Loader2 } from 'lucide-react'

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

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: url.trim() || null }),
      })
      
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        router.refresh()
      }
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
            Link this project to a GitHub repository for PR integration.
          </p>
        </div>
      </div>
      
      <div className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
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
    </div>
  )
}