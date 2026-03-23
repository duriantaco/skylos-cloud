import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Check, ChevronRight } from 'lucide-react';
import dogImg from "../../../../public/assets/favicon-96x96.png";
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { extractHeadings } from '@/lib/toc';
import { getCollectionStaticParams, getContentEntry } from '@/lib/content';
import { getSiteUrl } from '@/lib/site';
import {
  buildBreadcrumbList,
  buildFaqSchema,
  buildItemListSchema,
} from '@/lib/structured-data';
import TableOfContents from '@/components/TableOfContents';
import ArticleTrustPanel from '@/components/ArticleTrustPanel';
import '../../../app/blog/blog.css';

interface Props {
  params: Promise<{ slug: string }>;
}

const tagColors: Record<string, string> = {
  security: 'bg-red-100 text-red-700 border-red-200',
  sast: 'bg-blue-100 text-blue-700 border-blue-200',
  comparison: 'bg-violet-100 text-violet-700 border-violet-200',
  'dead code': 'bg-orange-100 text-orange-700 border-orange-200',
  python: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
};

type RelatedEntry = {
  collection: 'compare' | 'use-cases'
  slug: string
  title: string
  excerpt: string
}

function pickRelatedEntries(
  collection: 'compare' | 'use-cases',
  currentSlug: string,
  tags: string[],
  limit: number,
): RelatedEntry[] {
  const normalizedTags = tags.map((tag) => tag.toLowerCase())

  return getCollectionStaticParams(collection)
    .map(({ slug }) => getContentEntry(collection, slug))
    .filter((entry): entry is NonNullable<ReturnType<typeof getContentEntry>> => Boolean(entry))
    .filter((entry) => entry.slug !== currentSlug)
    .map((entry) => ({
      entry,
      score: entry.tags.filter((tag) => normalizedTags.includes(tag.toLowerCase())).length,
    }))
    .sort((a, b) => b.score - a.score || new Date(b.entry.publishedAt).getTime() - new Date(a.entry.publishedAt).getTime())
    .slice(0, limit)
    .map(({ entry }) => ({
      collection,
      slug: entry.slug,
      title: entry.title,
      excerpt: entry.excerpt,
    }))
}

export default async function ComparePost({ params }: Props) {
  const { slug } = await params;
  const post = getContentEntry('compare', slug);

  if (!post) {
    notFound();
  }

  const headings = extractHeadings(post.content);
  const siteUrl = getSiteUrl();
  const articleUrl = new URL(post.canonicalUrl, siteUrl).toString();
  const articleUpdatedAt = post.updatedAt ?? post.publishedAt;
  const relatedComparisons = pickRelatedEntries('compare', post.slug, post.tags, 2);
  const relatedUseCases = pickRelatedEntries('use-cases', post.slug, post.tags, 2);

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: post.title,
      description: post.excerpt,
      url: articleUrl,
      mainEntityOfPage: articleUrl,
      datePublished: post.publishedAt,
      dateModified: articleUpdatedAt,
      image: `${siteUrl}/og.png`,
      articleSection: 'Comparison',
      isAccessibleForFree: true,
      keywords: post.keywords.join(', '),
      author: {
        '@type': post.authorType,
        name: post.authorName,
        ...(post.authorType === 'Person' && post.authorRole ? { jobTitle: post.authorRole } : {}),
      },
      publisher: {
        '@type': 'Organization',
        name: 'Skylos',
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/assets/favicon-96x96.png`,
        },
      },
    },
    buildBreadcrumbList([
      { name: 'Home', item: siteUrl },
      { name: 'Compare', item: `${siteUrl}/compare` },
      { name: post.title, item: articleUrl },
    ]),
    ...(post.comparedItems.length > 0
      ? [buildItemListSchema({ name: `${post.title} compared tools`, url: articleUrl, items: post.comparedItems })]
      : []),
    ...(post.faq.length > 0 ? [buildFaqSchema(post.faq)] : []),
  ];

  return (
    <>
      {structuredData.map((schema, index) => (
        <script
          key={`schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.18),transparent_34%),linear-gradient(to_bottom,#faf5ff,#ffffff_28%,#f8fafc)]">
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

        <div className="border-b border-slate-200/70 bg-white/60 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/" className="text-slate-500 hover:text-slate-900 transition">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <Link href="/compare" className="text-slate-500 hover:text-slate-900 transition">
                Compare
              </Link>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-900 font-medium truncate">{post.title}</span>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid lg:grid-cols-[1fr_250px] gap-12">
            <article className="article-shell article-shell--violet min-w-0">
              <div className="px-6 py-7 md:px-10 md:py-10">
                <Link
                  href="/compare"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm shadow-slate-900/5 hover:text-slate-900 mb-8 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  All comparisons
                </Link>

                <header className="article-hero mb-12">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="article-kicker article-kicker--violet">Comparison</span>
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                              tagColors[tag.toLowerCase()] || tagColors.default
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-4 leading-[1.05]">
                    {post.title}
                  </h1>

                  <p className="article-excerpt">{post.excerpt}</p>

                  <ArticleTrustPanel
                    authorName={post.authorName}
                    authorRole={post.authorRole}
                    publishedAt={post.publishedAt}
                    updatedAt={articleUpdatedAt}
                    readingTime={post.readingTime}
                    methodology={post.methodology}
                    whyThisExists={post.whyThisExists}
                  />

                  <div className="mt-8 rounded-2xl border border-violet-200 bg-white p-6 shadow-sm shadow-slate-900/5">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Try this on your repo</div>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Use the comparison to narrow the choice, then verify it locally</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      The fastest answer is not another comparison page. It is a scan on code you already own, with a workflow you can trust.
                    </p>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Maintainer proof</div>
                        <p className="mt-2 text-sm font-semibold text-slate-900">Merged cleanup PRs into Black, networkx, mitmproxy, pypdf, and Flagsmith.</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Benchmark</div>
                        <p className="mt-2 text-sm font-semibold text-slate-900">98.1% recall on 9 repos, with 220 false positives vs Vulture&apos;s 644.</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Verification</div>
                        <p className="mt-2 text-sm font-semibold text-slate-900">35/35 LLM verification accuracy on pip-tools, tox, and mesa.</p>
                      </div>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Link
                        href="/docs"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
                      >
                        Run your first scan
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href="/use-cases"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
                      >
                        See use cases
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500" />
                        Start with <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">pip install skylos</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500" />
                        Run <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-900">skylos . -a</code> on one repo before wiring CI
                      </div>
                    </div>
                  </div>
                </header>

                {post.keyTakeaways.length > 0 && (
                  <section className="mb-10 rounded-2xl border border-violet-200 bg-violet-50/70 p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Short version</div>
                    <p className="mt-3 text-base leading-relaxed text-slate-700">{post.excerpt}</p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      {post.keyTakeaways.map((takeaway) => (
                        <li key={takeaway} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-600" />
                          <span>{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <div className="blog-content article-body">
                  <MDXRemote
                    source={post.content}
                    options={{
                      mdxOptions: {
                        remarkPlugins: [remarkGfm],
                        rehypePlugins: [
                          rehypeHighlight,
                          rehypeSlug,
                        ],
                      },
                    }}
                  />
                </div>

                {post.faq.length > 0 && (
                  <section className="mt-14 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Frequently asked questions</h2>
                    <div className="mt-6 space-y-3">
                      {post.faq.map((item) => (
                        <details key={item.question} className="group rounded-xl border border-slate-200 bg-white">
                          <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-slate-900">
                            {item.question}
                          </summary>
                          <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{item.answer}</p>
                        </details>
                      ))}
                    </div>
                  </section>
                )}

                <section className="mt-16 border-t border-slate-200 pt-8">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">What to read next</div>
                    <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Keep the research tight, then move to execution</h2>
                      <Link
                        href="/compare"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700 transition"
                      >
                        All comparisons
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      {relatedComparisons.map((entry) => (
                        <Link
                          key={`${entry.collection}-${entry.slug}`}
                          href={`/${entry.collection}/${entry.slug}`}
                          className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm transition"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Comparison</div>
                          <h3 className="mt-2 text-lg font-semibold text-slate-900">{entry.title}</h3>
                          <p className="mt-2 text-sm leading-relaxed text-slate-600">{entry.excerpt}</p>
                        </Link>
                      ))}
                      {relatedUseCases.map((entry) => (
                        <Link
                          key={`${entry.collection}-${entry.slug}`}
                          href={`/${entry.collection}/${entry.slug}`}
                          className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm transition"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Use case</div>
                          <h3 className="mt-2 text-lg font-semibold text-slate-900">{entry.title}</h3>
                          <p className="mt-2 text-sm leading-relaxed text-slate-600">{entry.excerpt}</p>
                        </Link>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Link
                        href="/docs"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
                      >
                        Run your first scan
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href="/use-cases"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
                      >
                        See matching use cases
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </section>
              </div>
            </article>

            <aside className="hidden lg:block">
              <TableOfContents headings={headings} />
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

export async function generateStaticParams() {
  return getCollectionStaticParams('compare');
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getContentEntry('compare', slug);

  if (!post) {
    return {
      title: 'Comparison Not Found',
    };
  }

  const siteUrl = getSiteUrl();
  const canonicalUrl = new URL(post.canonicalUrl, siteUrl).toString();
  const articleUpdatedAt = post.updatedAt ?? post.publishedAt;

  return {
    title: `${post.title} - Skylos`,
    description: post.excerpt,
    keywords: post.keywords,
    authors: [{ name: post.authorName }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: articleUpdatedAt,
      url: canonicalUrl,
      siteName: 'Skylos',
      images: [{ url: `${siteUrl}/og.png`, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [`${siteUrl}/og.png`],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}
