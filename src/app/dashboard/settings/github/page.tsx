"use client";

import { useState } from "react";

const GITHUB_APP_NAME = "skylos-gate"

export default function GitHubIntegration() {
  const [installing, setInstalling] = useState(false);
  
  const handleInstall = () => {
    setInstalling(true);
    const installUrl = `https://github.com/apps/${GITHUB_APP_NAME}/installations/new`;
    window.location.href = installUrl;
  };
  
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">GitHub Integration</h1>
      
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-2">🔒 Auto-Block PRs</h2>
        <p className="text-slate-600 mb-4">
          Install the Skylos GitHub App to automatically block PRs that fail the quality gate.
        </p>
        
        <ul className="text-sm text-slate-600 mb-6 space-y-2">
          <li>✓ Automatically configures branch protection</li>
          <li>✓ Shows check status directly on PRs</li>
          <li>✓ No manual setup required</li>
        </ul>
        
        <button
          onClick={handleInstall}
          disabled={installing}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          {installing ? "Redirecting..." : "Install GitHub App"}
        </button>
      </div>
    </div>
  );
}