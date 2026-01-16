'use client'

import { useState } from "react"
import { Github, CheckCircle, ExternalLink } from "lucide-react"

const GITHUB_APP_NAME = "skylos-gate"

type Props = {
  currentPlan: string
  githubInstallationId: number | null
  repoUrl: string | null
  projectId: string
}

export default function GitHubAppInstall({ currentPlan, githubInstallationId, repoUrl, projectId }: Props) {
  const [installing, setInstalling] = useState(false)
  
  const isPro = currentPlan === "pro" || currentPlan === "enterprise"
  const isInstalled = !!githubInstallationId
  
  const handleInstall = () => {
    setInstalling(true)
    const state = encodeURIComponent(projectId)
    window.location.href = `https://github.com/apps/${GITHUB_APP_NAME}/installations/new?state=${state}`
  }
  
  if (!isPro) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 mb-8 opacity-75">
        <div className="flex items-center gap-2 mb-2">
          <Github className="w-5 h-5" />
          <h3 className="text-lg font-semibold">GitHub App Integration</h3>
          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">PRO</span>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Automatically block PRs that fail the quality gate. Upgrade to Pro to enable.
        </p>
        
        <ul className="text-sm text-gray-500 mb-4 space-y-1">
          <li>🔒 Auto-configure branch protection</li>
          <li>🔒 Block merges on failed scans</li>
          <li>🔒 Show check status on PRs</li>
        </ul>
        
        <button
          disabled
          className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
        >
          Upgrade to Pro
        </button>
      </div>
    )
  }
  
  // Pro + Already installed
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
      
      <ul className="text-sm text-blue-600 mb-6 space-y-2">
        <li className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Automatically configures branch protection
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
        disabled={installing}
        className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium disabled:opacity-50 flex items-center gap-2"
      >
        <Github className="w-5 h-5" />
        {installing ? "Redirecting..." : "Install GitHub App"}
      </button>
      
      {!repoUrl && (
        <p className="text-xs text-orange-600 mt-3">
          ⚠️ Set your repository URL above first, so we can link the installation.
        </p>
      )}
    </div>
  )
}