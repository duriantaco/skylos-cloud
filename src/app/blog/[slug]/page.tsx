import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import dogImg from "../../../../public/assets/favicon-96x96.png";
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { extractHeadings } from '@/lib/toc';
import { getCollectionEntries, getCollectionStaticParams, getContentEntry } from '@/lib/content';
import { formatBlogDiscoveryLabel, getRelatedBlogPosts } from '@/lib/blog';
import { getSiteUrl } from '@/lib/site';
import {
  buildBreadcrumbList,
  buildFaqSchema,
  buildHowToSchema,
  buildItemListSchema,
} from '@/lib/structured-data';
import TableOfContents from '@/components/TableOfContents';
import ArticleTrustPanel from '@/components/ArticleTrustPanel';
import BlogArticleCta from '@/components/BlogArticleCta';
import BlogRelatedPosts from '@/components/BlogRelatedPosts';
import '../blog.css';

interface Props {
  params: Promise<{ slug: string }>;
}

const tagColors: Record<string, string> = {
  security: 'bg-red-100 text-red-700 border-red-200',
  sast: 'bg-blue-100 text-blue-700 border-blue-200',
  appsec: 'bg-purple-100 text-purple-700 border-purple-200',
  devtools: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getContentEntry('blog', slug);

  if (!post) {
    notFound();
  }

  const headings = extractHeadings(post.content);
  const siteUrl = getSiteUrl();
  const articleUrl = new URL(post.canonicalUrl, siteUrl).toString();
  const articleUpdatedAt = post.updatedAt ?? post.publishedAt;
  const relatedPosts = getRelatedBlogPosts(post, getCollectionEntries('blog'));

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      url: articleUrl,
      mainEntityOfPage: articleUrl,
      datePublished: post.publishedAt,
      dateModified: articleUpdatedAt,
      image: `${siteUrl}/og.png`,
      articleSection: 'Blog',
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
      { name: 'Blog', item: `${siteUrl}/blog` },
      { name: post.title, item: articleUrl },
    ]),
    ...(post.faq.length > 0 ? [buildFaqSchema(post.faq)] : []),
    ...(post.howToSteps.length > 0
      ? [buildHowToSchema({ name: post.title, description: post.excerpt, url: articleUrl, steps: post.howToSteps })]
      : []),
    ...(post.comparedItems.length > 0
      ? [buildItemListSchema({ name: `${post.title} covered tools`, url: articleUrl, items: post.comparedItems })]
      : []),
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

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.18),transparent_32%),linear-gradient(to_bottom,#f8fafc,#ffffff_28%,#f8fafc)]">
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

        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid lg:grid-cols-[1fr_250px] gap-12">
            <article className="article-shell article-shell--blue min-w-0">
              <div className="px-6 py-7 md:px-10 md:py-10">
                <header className="article-hero mb-10">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <Link
                      href="/blog"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm shadow-slate-900/5 transition hover:text-slate-900"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to blog
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Link href="/" className="transition hover:text-slate-900">
                        Home
                      </Link>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                      <Link href="/blog" className="transition hover:text-slate-900">
                        Blog
                      </Link>
                    </div>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <span className="article-kicker article-kicker--blue">{formatBlogDiscoveryLabel(post)}</span>
                    {post.frameworks.map((framework) => (
                      <span
                        key={framework}
                        className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700"
                      >
                        {framework}
                      </span>
                    ))}
                    {post.tags.slice(0, 3).map((tag) => (
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

                  <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05]">
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
                </header>

                {(post.keyTakeaways.length > 0 || post.howToSteps.length > 0) && (
                  <section className="mb-8 rounded-[1.75rem] border border-sky-200 bg-sky-50/70 p-5 md:p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Quick answer</div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-base">{post.excerpt}</p>

                    {post.keyTakeaways.length > 0 && (
                      <ul className="mt-4 grid gap-2 text-sm text-slate-700">
                        {post.keyTakeaways.slice(0, 4).map((takeaway) => (
                          <li key={takeaway} className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sky-600" />
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {post.howToSteps.length > 0 && (
                      <ol className="mt-5 grid gap-3 md:grid-cols-3">
                        {post.howToSteps.map((step, index) => (
                          <li key={step.name} className="rounded-xl border border-white/80 bg-white p-4 shadow-sm shadow-slate-900/5">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Step {index + 1}</div>
                            <div className="mt-2 font-semibold text-slate-900">{step.name}</div>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                )}

                <div className="mb-10">
                  <BlogArticleCta post={post} compact />
                </div>

                <TableOfContents headings={headings} mobileOnly />

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
                  <section className="mt-14 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
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

                <div className="mt-14">
                  <BlogArticleCta post={post} />
                </div>

                <BlogRelatedPosts posts={relatedPosts} />
              </div>
            </article>

            <aside className="hidden lg:block">
              <TableOfContents headings={headings} desktopOnly />
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

export async function generateStaticParams() {
  return getCollectionStaticParams('blog');
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getContentEntry('blog', slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  const siteUrl = getSiteUrl();
  const canonicalUrl = new URL(post.canonicalUrl, siteUrl).toString();
  const articleUpdatedAt = post.updatedAt ?? post.publishedAt;

  return {
    title: `${post.title} - Skylos Blog`,
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
