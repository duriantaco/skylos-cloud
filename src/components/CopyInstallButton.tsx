'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export default function CopyInstallButton({
  command = 'pip install skylos',
}: {
  command?: string
}) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 font-mono text-sm text-slate-900 hover:bg-slate-100 transition"
      aria-label="Copy install command"
    >
      <span className="text-indigo-600">$</span> {command}
      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
    </button>
  )
}
