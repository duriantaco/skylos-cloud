'use client'

import { useState, useEffect } from 'react'
import { 
  Check, 
  X, 
  Loader2, 
  Send, 
  Trash2, 
  ExternalLink,
  Bell,
  BellOff,
} from 'lucide-react'

// Discord icon SVG
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

type NotifyOn = 'failure' | 'always' | 'recovery'

type DiscordSettings = {
  hasWebhook: boolean
  maskedWebhook: string | null
  enabled: boolean
  notifyOn: NotifyOn
}

const NOTIFY_OPTIONS: { value: NotifyOn; label: string; desc: string }[] = [
  { value: 'failure', label: 'On Failure', desc: 'Only when gate fails' },
  { value: 'always', label: 'Always', desc: 'Every scan result' },
  { value: 'recovery', label: 'Failure + Recovery', desc: 'Failures and when fixed' },
]

export default function DiscordIntegration({ projectId }: { projectId: string }) {
  const [settings, setSettings] = useState<DiscordSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [webhookUrl, setWebhookUrl] = useState('')
  const [showWebhookInput, setShowWebhookInput] = useState(false)
  const [notifyOn, setNotifyOn] = useState<NotifyOn>('failure')
  const [enabled, setEnabled] = useState(false)

  // Fetch current settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(`/api/projects/${projectId}/discord`)
        if (res.ok) {
          const data = await res.json()
          setSettings(data)
          setEnabled(data.enabled)
          setNotifyOn(data.notifyOn || 'failure')
        }
      } catch (e) {
        console.error('Failed to fetch Discord settings:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [projectId])

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const handleTest = async () => {
    if (!webhookUrl.trim()) {
      setError('Please enter a webhook URL')
      return
    }
    
    clearMessages()
    setTesting(true)
    
    try {
      const res = await fetch(`/api/projects/${projectId}/discord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, test: true }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Test failed')
      } else {
        setSuccess('Test message sent! Check your Discord channel.')
      }
    } catch (e) {
      setError('Failed to send test message')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    clearMessages()
    setSaving(true)
    
    try {
      const body: Record<string, any> = { enabled, notifyOn }
      if (webhookUrl.trim()) {
        body.webhookUrl = webhookUrl.trim()
      }
      
      const res = await fetch(`/api/projects/${projectId}/discord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Failed to save')
      } else {
        setSuccess('Settings saved!')
        setShowWebhookInput(false)
        setWebhookUrl('')
        // Refresh settings
        const refreshRes = await fetch(`/api/projects/${projectId}/discord`)
        if (refreshRes.ok) {
          setSettings(await refreshRes.json())
        }
      }
    } catch (e) {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remove Discord integration? You can add it back anytime.')) return
    
    clearMessages()
    setSaving(true)
    
    try {
      const res = await fetch(`/api/projects/${projectId}/discord`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        setSettings({ hasWebhook: false, maskedWebhook: null, enabled: false, notifyOn: 'failure' })
        setEnabled(false)
        setSuccess('Discord integration removed')
      } else {
        setError('Failed to remove integration')
      }
    } catch (e) {
      setError('Failed to remove integration')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    clearMessages()
    const newEnabled = !enabled
    setEnabled(newEnabled)
    
    try {
      const res = await fetch(`/api/projects/${projectId}/discord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      })
      
      if (!res.ok) {
        setEnabled(!newEnabled) // Revert
        setError('Failed to update')
      }
    } catch (e) {
      setEnabled(!newEnabled) // Revert
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          <span className="text-slate-500">Loading Discord settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#5865F2] flex items-center justify-center">
            <DiscordIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Discord Notifications</h3>
            <p className="text-sm text-slate-500">
              Get notified when quality gates fail
            </p>
          </div>
        </div>
        
        {settings?.hasWebhook && (
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`
              relative w-12 h-7 rounded-full transition-colors duration-200
              ${enabled ? 'bg-emerald-500' : 'bg-slate-200'}
            `}
          >
            <span
              className={`
                absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
                ${enabled ? 'left-6' : 'left-1'}
              `}
            />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Messages */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-red-700 text-sm">
            <X className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2 text-emerald-700 text-sm">
            <Check className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Connected State */}
        {settings?.hasWebhook && !showWebhookInput ? (
          <div className="space-y-4">
            {/* Connected webhook display */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">Webhook Connected</div>
                  <div className="text-xs text-slate-500 font-mono">{settings.maskedWebhook}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWebhookInput(true)}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  Update
                </button>
                <button
                  onClick={handleRemove}
                  disabled={saving}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notify settings */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                When to notify
              </label>
              <div className="grid grid-cols-3 gap-2">
                {NOTIFY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={async () => {
                      setNotifyOn(opt.value)
                      clearMessages()
                      try {
                        await fetch(`/api/projects/${projectId}/discord`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ notifyOn: opt.value }),
                        })
                      } catch (e) {}
                    }}
                    className={`
                      px-3 py-2 rounded-lg text-sm text-left transition border
                      ${notifyOn === opt.value 
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}
                    `}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs opacity-70">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Setup State */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Discord Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Server Settings → Integrations → Webhooks →{' '}
                <a
                  href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                >
                  Create Webhook
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTest}
                disabled={testing || !webhookUrl.trim()}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Test Webhook
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving || !webhookUrl.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-[#5865F2] hover:bg-[#4752C4] rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save & Enable
              </button>

              {showWebhookInput && (
                <button
                  onClick={() => {
                    setShowWebhookInput(false)
                    setWebhookUrl('')
                    clearMessages()
                  }}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status footer */}
      {settings?.hasWebhook && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs">
            {enabled ? (
              <>
                <Bell className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Notifications active</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">
                  {notifyOn === 'failure' && 'Notifying on failures only'}
                  {notifyOn === 'always' && 'Notifying on every scan'}
                  {notifyOn === 'recovery' && 'Notifying on failures and recovery'}
                </span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Notifications paused</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}