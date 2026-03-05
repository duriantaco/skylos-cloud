"use client"

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Error</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
          Something went wrong
        </h1>
        <p className="mt-4 text-slate-600">
          An unexpected error occurred. Please try again.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Try again
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
