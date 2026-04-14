'use client'

import { useState } from "react"
import { Github, CheckCircle, ExternalLink } from "lucide-react"
import { getGitHubInstallUrl } from "@/app/dashboard/settings/github-actions"

const GITHUB_APP_NAME = "skylos-gate"

type Props = {
  currentPlan: string
  githubInstallationId: number | null
  repoUrl: string | null
  projectId: string
  autoConfigureEnabled: boolean
  canManageSettings: boolean
}

export default function GitHubAppInstall({
  currentPlan,
  githubInstallationId,
  repoUrl,
  projectId,
  autoConfigureEnabled,
  canManageSettings,
}: Props) {
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)
  const [autoConfigure, setAutoConfigure] = useState(autoConfigureEnabled)
  const [savingAutoConfigure, setSavingAutoConfigure] = useState(false)
  const [autoConfigureError, setAutoConfigureError] = useState<string | null>(null)

  const hasWorkspaceAccess = currentPlan === "pro" || currentPlan === "enterprise"
  const isInstalled = !!githubInstallationId

  const handleAutoConfigureChange = async (enabled: boolean) => {
    if (!canManageSettings) {
      return
    }

    setAutoConfigure(enabled)
    setSavingAutoConfigure(true)
    setAutoConfigureError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/github-config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          autoConfigureOnInstall: enabled,
        }),
      })

      if (!response.ok) {
        setAutoConfigure(!enabled)
        setAutoConfigureError("Failed to save GitHub repository automation preference.")
      }
    } catch {
      setAutoConfigure(!enabled)
      setAutoConfigureError("Failed to save GitHub repository automation preference.")
    } finally {
      setSavingAutoConfigure(false)
    }
  }

  const handleInstall = async () => {
    setInstalling(true)
    setInstallError(null)

    try {
      const url = await getGitHubInstallUrl(projectId)
      window.location.href = url
    } catch {
      setInstallError("Failed to start GitHub App installation.")
      setInstalling(false)
    }
  }
  
  if (!hasWorkspaceAccess) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 mb-8 opacity-75">
        <div className="flex items-center gap-2 mb-2">
          <Github className="w-5 h-5" />
          <h3 className="text-lg font-semibold">GitHub App Integration</h3>
          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">WORKSPACE</span>
        </div>
        
        <p className="text-sm text-gray-700 mb-4">
          Automatically block PRs that fail the quality gate. Buy any credit pack to unlock Workspace access.
        </p>
        
        <ul className="text-sm text-gray-500 mb-4 space-y-1">
          <li>🔒 Auto-configure branch protection</li>
          <li>🔒 Block merges on failed scans</li>
          <li>🔒 Show check status on PRs</li>
        </ul>
        
        <a
          href="/dashboard/billing"
          className="inline-block px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
        >
          Unlock Workspace
        </a>
      </div>
    )
  }
  
  // Workspace access + already installed
  if (isInstalled) {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Github className="w-5 h-5 text-green-700" />
          <h3 className="text-lg font-semibold text-green-900">GitHub App Installed</h3>
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
        
      <p className="text-sm text-green-700 mb-4">
          Your repository is connected! PRs will be blocked if they fail the quality gate.
        </p>

        <GitHubAutoConfigureToggle
          autoConfigure={autoConfigure}
          disabled={savingAutoConfigure || !canManageSettings}
          error={autoConfigureError}
          canManageSettings={canManageSettings}
          onChange={handleAutoConfigureChange}
        />
        
        <div className="flex items-center gap-4">
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-700 hover:text-green-900 flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              {repoUrl.replace("https://github.com/", "")}
            </a>
          )}
          <a
            href={`https://github.com/apps/${GITHUB_APP_NAME}/installations/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Manage installation →
          </a>
        </div>
      </div>
    )
  }
  
  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6 mb-8">
      <div className="flex items-center gap-2 mb-2">
        <Github className="w-5 h-5 text-blue-700" />
        <h3 className="text-lg font-semibold text-blue-900">Install GitHub App</h3>
      </div>
      
      <p className="text-sm text-blue-700 mb-4">
        Install the Skylos GitHub App to automatically block PRs that fail the quality gate.
      </p>

      <GitHubAutoConfigureToggle
        autoConfigure={autoConfigure}
        disabled={savingAutoConfigure || !canManageSettings}
        error={autoConfigureError}
        canManageSettings={canManageSettings}
        onChange={handleAutoConfigureChange}
      />
      
      <ul className="text-sm text-blue-600 mb-6 space-y-2">
        <li className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Optional repo bootstrap with explicit per-project consent
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Shows ✅/❌ check status on PRs
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Blocks merges when quality gate fails
        </li>
      </ul>
      
      <button
        onClick={handleInstall}
        disabled={installing || !canManageSettings}
        className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium disabled:opacity-50 flex items-center gap-2"
      >
        <Github className="w-5 h-5" />
        {!canManageSettings ? "Admin access required" : installing ? "Redirecting..." : "Install GitHub App"}
      </button>
      
      {!repoUrl && (
        <p className="text-xs text-orange-600 mt-3">
          ⚠️ Set your repository URL above first, so we can link the installation.
        </p>
      )}

      {installError && (
        <p className="text-xs text-red-600 mt-3">{installError}</p>
      )}

      {!canManageSettings && (
        <p className="text-xs text-slate-600 mt-3">
          Only organization admins and owners can connect or reconfigure the GitHub App.
        </p>
      )}
    </div>
  )
}

function GitHubAutoConfigureToggle({
  autoConfigure,
  disabled,
  error,
  canManageSettings,
  onChange,
}: {
  autoConfigure: boolean
  disabled: boolean
  error: string | null
  canManageSettings: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 p-4 mb-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300"
          checked={autoConfigure}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <div>
          <div className="text-sm font-medium text-slate-900">
            Allow Skylos to update branch protection and open a workflow PR after install
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Default is off. When enabled, Skylos may add the quality gate status check on the default branch and open a PR for `.github/workflows/skylos.yml`.
          </p>
          {!canManageSettings && (
            <p className="text-xs text-slate-500 mt-2">
              Only admins and owners can change this setting.
            </p>
          )}
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      </label>
    </div>
  )
}
