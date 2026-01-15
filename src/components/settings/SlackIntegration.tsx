'use client'

import { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  Check, 
  X, 
  Loader2, 
  Send, 
  Trash2, 
  ExternalLink,
  Bell,
  BellOff,
} from 'lucide-react'

type NotifyOn = 'failure' | 'always' | 'recovery'

type SlackSettings = {
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

export default function SlackIntegration({ projectId }: { projectId: string }) {
  const [settings, setSettings] = useState<SlackSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [webhookUrl, setWebhookUrl] = useState('')
  const [showWebhookInput, setShowWebhookInput] = useState(false)
  const [notifyOn, setNotifyOn] = useState<NotifyOn>('failure')
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(`/api/projects/${projectId}/slack`)
        if (res.ok) {
          const data = await res.json()
          setSettings(data)
          setEnabled(data.enabled)
          setNotifyOn(data.notifyOn || 'failure')
        }
      } catch (e) {
        console.error('Failed to fetch Slack settings:', e)
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
      const res = await fetch(`/api/projects/${projectId}/slack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, test: true }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Test failed')
      } else {
        setSuccess('Test message sent! Check your Slack channel.')
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
      
      const res = await fetch(`/api/projects/${projectId}/slack`, {
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
        const refreshRes = await fetch(`/api/projects/${projectId}/slack`)
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
    if (!confirm('Remove Slack integration? You can add it back anytime.')) return
    
    clearMessages()
    setSaving(true)
    
    try {
      const res = await fetch(`/api/projects/${projectId}/slack`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        setSettings({ hasWebhook: false, maskedWebhook: null, enabled: false, notifyOn: 'failure' })
        setEnabled(false)
        setSuccess('Slack integration removed')
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
      const res = await fetch(`/api/projects/${projectId}/slack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      })
      
      if (!res.ok) {
        setEnabled(!newEnabled)
        setError('Failed to update')
      }
    } catch (e) {
      setEnabled(!newEnabled)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          <span className="text-slate-500">Loading Slack settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Slack Notifications</h3>
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
                        await fetch(`/api/projects/${projectId}/slack`, {
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
                Slack Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Create an{' '}
                <a
                  href="https://api.slack.com/messaging/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                >
                  Incoming Webhook
                  <ExternalLink className="w-3 h-3" />
                </a>
                {' '}in your Slack workspace
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
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
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