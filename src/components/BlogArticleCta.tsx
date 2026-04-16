import Link from 'next/link'
import { ArrowRight, Terminal } from 'lucide-react'
import { ContentEntry } from '@/lib/content'
import { getBlogCta } from '@/lib/blog'

export default function BlogArticleCta({
  post,
  compact = false,
}: {
  post: ContentEntry
  compact?: boolean
}) {
  const cta = getBlogCta(post)

  return (
    <section
      className={`relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.2),transparent_35%),linear-gradient(135deg,#ffffff,#f8fafc)] shadow-[0_28px_80px_-60px_rgba(15,23,42,0.45)] ${
        compact ? 'p-5 md:p-6' : 'p-6 md:p-8'
      }`}
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-100/60 blur-2xl" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
          <Terminal className="h-3.5 w-3.5" />
          {cta.eyebrow}
        </div>
        <h2 className={`mt-4 font-bold tracking-tight text-slate-900 ${compact ? 'text-2xl' : 'text-3xl'}`}>
          {cta.title}
        </h2>
        <p className={`mt-3 max-w-2xl leading-relaxed text-slate-600 ${compact ? 'text-sm' : 'text-base'}`}>
          {cta.description}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={cta.primary.href}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {cta.primary.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {cta.secondary ? (
            <Link
              href={cta.secondary.href}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              {cta.secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}
