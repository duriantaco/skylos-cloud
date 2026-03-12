import { Calendar, Clock, RefreshCw, User } from 'lucide-react'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function ArticleTrustPanel({
  authorName,
  authorRole,
  publishedAt,
  updatedAt,
  readingTime,
  methodology = [],
  whyThisExists,
}: {
  authorName: string
  authorRole?: string
  publishedAt: string
  updatedAt?: string
  readingTime: number
  methodology?: string[]
  whyThisExists?: string
}) {
  const showUpdated = updatedAt && updatedAt !== publishedAt
  const showTrustBox = methodology.length > 0 || Boolean(whyThisExists)

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm shadow-slate-900/5">
          <User className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-900">{authorName}</span>
          {authorRole ? <span className="text-slate-500">• {authorRole}</span> : null}
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm shadow-slate-900/5">
          <Calendar className="h-4 w-4" />
          <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
        </div>

        {showUpdated ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm shadow-slate-900/5">
            <RefreshCw className="h-4 w-4" />
            <span>Updated {formatDate(updatedAt)}</span>
          </div>
        ) : null}

        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm shadow-slate-900/5">
          <Clock className="h-4 w-4" />
          <span>{readingTime} min read</span>
        </div>
      </div>

      {showTrustBox ? (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(191,219,254,0.45),transparent_35%),linear-gradient(135deg,#ffffff,#f8fafc)] p-6 shadow-[0_28px_80px_-60px_rgba(15,23,42,0.4)]">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-100/60 blur-2xl" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">About this page</p>
          {whyThisExists ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              {whyThisExists}
            </p>
          ) : null}
          {methodology.length > 0 ? (
            <ul className="mt-5 grid gap-3 text-sm leading-relaxed text-slate-600">
              {methodology.map((item) => (
                <li key={item} className="flex gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm shadow-slate-900/5">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
