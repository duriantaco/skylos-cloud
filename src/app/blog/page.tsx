import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Rss } from 'lucide-react';
import dogImg from "../../../public/assets/favicon-96x96.png";
import BlogList from '@/components/BlogList';
import { getCollectionEntries } from '@/lib/content';
import { BLOG_ARTICLE_TYPES, BLOG_TOPICS } from '@/lib/blog';
import { getSiteUrl } from '@/lib/site';
import { buildCollectionPageSchema } from '@/lib/structured-data';

export default function BlogPage() {
  const siteUrl = getSiteUrl();
  const posts = getCollectionEntries('blog');
  const listItems = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    authorName: post.authorName,
    tags: post.tags,
    keywords: post.keywords,
    keyTakeaways: post.keyTakeaways,
    readingTime: post.readingTime,
    articleType: post.articleType,
    topic: post.topic,
    frameworks: post.frameworks,
    featuredReason: post.featuredReason,
  }));
  const articleTypeCount = BLOG_ARTICLE_TYPES.filter((articleType) =>
    posts.some((post) => post.articleType === articleType)
  ).length;
  const topicCount = BLOG_TOPICS.filter((topic) => posts.some((post) => post.topic === topic)).length;

  const collectionSchema = buildCollectionPageSchema({
    name: 'Skylos blog',
    description: 'Research-backed guides on Python security scanning, dead code detection, AI-assisted code review, and CI hardening.',
    url: `${siteUrl}/blog`,
    itemUrls: posts.map((post) => ({
      name: post.title,
      url: new URL(post.canonicalUrl, siteUrl).toString(),
    })),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-slate-900">
            <Image
              src={dogImg}
              alt="Skylos"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            Skylos
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/blog" className="text-sm text-slate-900 font-medium">
              Blog
            </Link>
            <Link href="/compare" className="text-sm text-slate-500 hover:text-slate-900 transition">
              Compare
            </Link>
            <Link href="/use-cases" className="text-sm text-slate-500 hover:text-slate-900 transition">
              Use Cases
            </Link>
            <Link href="/docs" className="text-sm text-slate-500 hover:text-slate-900 transition">
              Docs
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <div className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600 shadow-sm shadow-slate-900/5">
                Research-backed developer blog
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-bold tracking-tight text-slate-900 md:text-6xl">
                Python security, static analysis, and AI code review that developers can actually use
              </h1>
              <p className="mt-5 max-w-3xl text-xl leading-relaxed text-slate-600">
                Framework guides, benchmarks, incident-style research, and CI workflows for Python teams that want lower-noise AppSec and better AI-generated code review.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/docs/getting-started"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Try Skylos locally
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/blog/feed.xml"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <Rss className="h-4 w-4" />
                  Follow via RSS
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_-70px_rgba(15,23,42,0.45)]">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Coverage</div>
                <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{posts.length}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">Articles across Python security, AI code risk, dead code, CI hardening, and workflow changes.</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_-70px_rgba(15,23,42,0.45)]">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Topics</div>
                <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{topicCount}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">Curated discovery paths so readers can scan by job-to-be-done instead of publish date.</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_-70px_rgba(15,23,42,0.45)]">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Formats</div>
                <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{articleTypeCount}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">Guides, benchmarks, case studies, comparisons, and research pieces with clear next steps.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BlogList posts={listItems} />
    </div>
  );
}

export const metadata = {
  title: 'Python Security & Static Analysis Blog - Skylos',
  description: 'Research-backed guides on Python security scanning, dead code detection, GitHub Actions hardening, and AI-generated code review. Real benchmarks and implementation steps.',
  keywords: [
    'python security blog',
    'python static analysis guide',
    'python security scanner github actions',
    'python dead code detection',
    'ai generated code security python',
    'python sast comparison',
    'flask security scanning',
    'python linting deprecated vscode',
  ],
  openGraph: {
    title: 'Python Security & Static Analysis Blog - Skylos',
    description: 'Benchmarks, GitHub Actions hardening, AI code review workflows, and Python static analysis guides.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Python Security & Static Analysis Blog - Skylos',
    description: 'Benchmarks, GitHub Actions hardening, AI code review workflows, and Python static analysis guides.',
  },
  alternates: {
    canonical: '/blog',
  },
};
