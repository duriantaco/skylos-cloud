import Link from 'next/link';
import Image from 'next/image';
import dogImg from "../../../public/assets/favicon-96x96.png";
import { ArrowRight, Calendar, GitCompareArrows, Check } from 'lucide-react';
import { getCollectionEntries } from '@/lib/content';
import { getSiteUrl } from '@/lib/site';
import { buildCollectionPageSchema } from '@/lib/structured-data';

interface ComparisonPost {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  tags: string[];
}

const tagColors: Record<string, string> = {
  sast: 'bg-blue-100 text-blue-700 border-blue-200',
  security: 'bg-red-100 text-red-700 border-red-200',
  comparison: 'bg-violet-100 text-violet-700 border-violet-200',
  'dead code': 'bg-orange-100 text-orange-700 border-orange-200',
  python: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function ComparePage() {
  const siteUrl = getSiteUrl();
  const posts = getCollectionEntries('compare').map<ComparisonPost>((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    tags: post.tags,
  }));

  const collectionSchema = buildCollectionPageSchema({
    name: 'Skylos comparison hub',
    description: 'Side-by-side comparisons of Bandit, Semgrep, CodeQL, Snyk, SonarQube, Vulture, and other Python static analysis tools.',
    url: `${siteUrl}/compare`,
    itemUrls: getCollectionEntries('compare').map((post) => ({
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
            <Link href="/compare" className="text-sm text-slate-900 font-medium">
              Compare
            </Link>
            <Link href="/use-cases" className="text-sm text-slate-500 hover:text-slate-900 transition">
              Use Cases
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-sm font-medium mb-6">
            <GitCompareArrows className="w-4 h-4" />
            Tool Comparisons
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-5">
            Compare Python security and dead-code tools without the vendor fluff
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            These pages are built from published docs, benchmarks, and real workflow tradeoffs. Use them to narrow the shortlist, then run Skylos on a repo you actually ship.
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
              href="/blog/3-merged-prs-dead-code-in-black-flagsmith-pypdf"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
            >
              See maintainer proof
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
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">How to use this page</div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Choose a tool, then verify it on a real repo</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                These comparisons are for narrowing the decision. The fastest way to know if Skylos fits your workflow is still a local scan on code you already own.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Start with <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">pip install skylos</code>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Run <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">skylos . -a</code> on one repo
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Add <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">skylos cicd init</code> only if the signal is useful
              </div>
            </div>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center">
            <p className="text-slate-500">Comparison articles coming soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <Link
                key={post.slug}
                href={`/compare/${post.slug}`}
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
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <time>
                          {new Date(post.publishedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </time>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-sm font-medium text-slate-900 group-hover:gap-2 transition-all">
                      Compare options
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Next step</div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">Move from tool comparison to a real workflow</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                If the comparison points toward Skylos, the right next move is not a demo. It is a local scan on a repo you already maintain.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition"
              >
                Run your first scan
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/use-cases"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                See real use cases
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
  title: 'Compare Python SAST Tools - Skylos',
  description: 'Side-by-side comparisons of Python static analysis and code scanning tools including Bandit, CodeQL, Semgrep, Snyk, SonarQube, and Vulture.',
  keywords: [
    'python sast comparison',
    'bandit vs codeql vs semgrep python',
    'semgrep alternative python',
    'codeql alternative python',
    'snyk alternative python',
    'sonarqube alternative python',
    'vulture alternative python',
    'best python sast tools 2026',
  ],
  openGraph: {
    title: 'Compare Python SAST Tools - Skylos',
    description: 'Honest comparisons of Python static analysis and code scanning tools.',
    type: 'website',
  },
  alternates: {
    canonical: '/compare',
  },
};
