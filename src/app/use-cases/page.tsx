import Link from 'next/link';
import Image from 'next/image';
import dogImg from "../../../public/assets/favicon-96x96.png";
import { ArrowRight, Calendar, Shield, Check } from 'lucide-react';
import { getCollectionEntries } from '@/lib/content';
import { getSiteUrl } from '@/lib/site';
import { buildCollectionPageSchema } from '@/lib/structured-data';

interface UseCasePost {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  tags: string[];
}

const tagColors: Record<string, string> = {
  'dead code': 'bg-orange-100 text-orange-700 border-orange-200',
  security: 'bg-red-100 text-red-700 border-red-200',
  'ai code': 'bg-violet-100 text-violet-700 border-violet-200',
  ci: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  python: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function UseCasesPage() {
  const siteUrl = getSiteUrl();
  const content = getCollectionEntries('use-cases');
  const posts = content.map<UseCasePost>((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    tags: post.tags,
  }));

  const collectionSchema = buildCollectionPageSchema({
    name: 'Skylos use cases',
    description: 'Practical guides for Python dead code detection, GitHub Actions hardening, MCP security, AI-agent guardrails, and diff-aware review workflows.',
    url: `${siteUrl}/use-cases`,
    itemUrls: content.map((post) => ({
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
            <Link href="/blog" className="text-sm text-slate-500 hover:text-slate-900 transition">
              Blog
            </Link>
            <Link href="/compare" className="text-sm text-slate-500 hover:text-slate-900 transition">
              Compare
            </Link>
            <Link href="/use-cases" className="text-sm text-slate-900 font-medium">
              Use Cases
            </Link>
            <Link href="/judge" className="text-sm text-slate-500 hover:text-slate-900 transition">
              Judge
            </Link>
            <Link href="/docs" className="text-sm text-slate-500 hover:text-slate-900 transition">
              Docs
            </Link>
            <Link
              href="/docs"
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
            >
              Try locally
            </Link>
          </div>
        </div>
      </nav>

      <div className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            Use Cases
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-5">
            Practical Python workflows for AI code review, CI hardening, and dead-code cleanup
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Use these guides when the problem is concrete: secure GitHub Actions, catch AI-generated mistakes, or clean dead code without drowning in false positives.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Run your first scan
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
            >
              Compare tools first
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/judge"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
            >
              See public repo grades
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Maintainer proof</div>
              <p className="mt-2 text-sm font-semibold text-slate-900">Merged cleanup PRs into Black, networkx, mitmproxy, pypdf, and Flagsmith.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Benchmark</div>
              <p className="mt-2 text-sm font-semibold text-slate-900">98.1% recall on 9 Python repos, with 220 false positives vs Vulture&apos;s 644.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Verification</div>
              <p className="mt-2 text-sm font-semibold text-slate-900">35/35 LLM verification accuracy on pip-tools, tox, and mesa.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">How to use these guides</div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Start with one workflow you already run</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Pick the guide that matches the job in front of you, run Skylos locally, and only wire it into CI after you trust the results.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Install the CLI with <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">pip install skylos</code>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Run <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">skylos . -a</code> on a real repo
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Use <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">skylos cicd init</code> when you are ready to gate PRs
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Review <Link href="/judge" className="underline decoration-slate-300 hover:decoration-slate-900">Judge scorecards</Link> for public-repo examples
              </div>
            </div>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center">
            <p className="text-slate-500">Use case guides coming soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <Link
                key={post.slug}
                href={`/use-cases/${post.slug}`}
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all"
              >
                <div className="p-6">
                  {post.tags.length > 0 && (
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {post.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            tagColors[tag.toLowerCase()] || tagColors.default
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-slate-700 transition line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed text-sm">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <time>
                        {new Date(post.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </time>
                    </div>

                    <div className="flex items-center gap-1 text-sm font-medium text-slate-900 group-hover:gap-2 transition-all">
                      Read guide
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Next step</div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">Turn the guide into a real scan</h2>
              <p className="mt-2 text-sm leading-relaxed text-emerald-50">
                The guide is useful only if it maps to a repo you already own. Start with a local scan, then decide whether this workflow belongs in CI.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition"
              >
                Run your first scan
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/compare"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                Compare alternatives
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Use Cases - Skylos',
  description: 'Practical Python guides for dead code detection, secure GitHub Actions, MCP security, and AI-generated code review workflows.',
  keywords: [
    'detect dead code python',
    'python security scanner github actions',
    'secure github actions python',
    'ai generated code security python',
    'secure mcp server',
    'claude code security review',
    'cursor security scanner',
    'github copilot security review',
    'ai security regression detection',
    'llm application security scanner',
    'python static analysis use cases',
  ],
  openGraph: {
    title: 'Use Cases - Skylos',
    description: 'Practical guides for Python static analysis, GitHub Actions security, MCP hardening, and AI code review.',
    type: 'website',
  },
  alternates: {
    canonical: '/use-cases',
  },
};
