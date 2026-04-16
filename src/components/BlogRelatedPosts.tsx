import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { ContentEntry } from '@/lib/content'
import { formatBlogDiscoveryLabel } from '@/lib/blog'

export default function BlogRelatedPosts({ posts }: { posts: ContentEntry[] }) {
  if (posts.length === 0) {
    return null
  }

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Continue exploring</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Related reading</h2>
        </div>
        <Link href="/blog" className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-900 md:inline-flex">
          All articles
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-60px_rgba(15,23,42,0.35)] transition hover:border-slate-300 hover:shadow-[0_32px_90px_-60px_rgba(15,23,42,0.4)]"
          >
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {formatBlogDiscoveryLabel(post)}
            </div>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900 transition group-hover:text-slate-700">
              {post.title}
            </h3>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readingTime} min read
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 transition group-hover:gap-2">
                Read next
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
