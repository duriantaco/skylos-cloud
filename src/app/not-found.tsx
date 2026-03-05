import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">404</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
          Page not found
        </h1>
        <p className="mt-4 text-slate-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Go home
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="https://docs.skylos.dev/"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
          >
            View docs
          </Link>
        </div>
      </div>
    </main>
  )
}
