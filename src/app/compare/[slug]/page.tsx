import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import dogImg from "../../../../public/assets/favicon-96x96.png";
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { extractHeadings, estimateReadingTime } from '@/lib/toc';
import { getAuthorMeta, getMethodology, getUpdatedAt, getWhyThisExists } from '@/lib/content-meta';
import { getSiteUrl } from '@/lib/site';
import TableOfContents from '@/components/TableOfContents';
import ArticleTrustPanel from '@/components/ArticleTrustPanel';
import '../../../app/blog/blog.css';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  const filePath = path.join(process.cwd(), 'src/content/compare', `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    frontmatter: data,
    content,
  };
}

const tagColors: Record<string, string> = {
  security: 'bg-red-100 text-red-700 border-red-200',
  sast: 'bg-blue-100 text-blue-700 border-blue-200',
  comparison: 'bg-violet-100 text-violet-700 border-violet-200',
  'dead code': 'bg-orange-100 text-orange-700 border-orange-200',
  python: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default async function ComparePost({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const { frontmatter, content } = post;
  const frontmatterRecord = frontmatter as Record<string, unknown>;
  const headings = extractHeadings(content);
  const readingTime = estimateReadingTime(content);
  const siteUrl = getSiteUrl();
  const articleUrl = `${siteUrl}/compare/${slug}`;
  const author = getAuthorMeta(frontmatterRecord);
  const methodology = getMethodology(frontmatterRecord);
  const whyThisExists = getWhyThisExists(frontmatterRecord);
  const articleUpdatedAt = getUpdatedAt(frontmatterRecord) ?? frontmatter.publishedAt;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: frontmatter.title,
    description: frontmatter.excerpt,
    url: articleUrl,
    mainEntityOfPage: articleUrl,
    datePublished: frontmatter.publishedAt,
    dateModified: articleUpdatedAt,
    image: `${siteUrl}/og.png`,
    keywords: Array.isArray(frontmatter.keywords) ? frontmatter.keywords.join(', ') : undefined,
    author: {
      '@type': author.type,
      name: author.name,
      ...(author.type === 'Person' && author.role ? { jobTitle: author.role } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Skylos',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/assets/favicon-96x96.png`,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.18),transparent_34%),linear-gradient(to_bottom,#faf5ff,#ffffff_28%,#f8fafc)]">
        {/* Navbar */}
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
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                Beta
              </span>
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
                href="/login"
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
              >
                Get started
              </Link>
            </div>
          </div>
        </nav>

        {/* Breadcrumbs */}
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
              <span className="text-slate-900 font-medium truncate">{frontmatter.title}</span>
            </nav>
          </div>
        </div>

        {/* Article with sidebar */}
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
                {frontmatter.tags && frontmatter.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {frontmatter.tags.map((tag: string) => (
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
                  {frontmatter.title}
                </h1>

                <p className="article-excerpt">
                  {frontmatter.excerpt}
                </p>

                <ArticleTrustPanel
                  authorName={author.name}
                  authorRole={author.role}
                  publishedAt={frontmatter.publishedAt}
                  updatedAt={articleUpdatedAt}
                  readingTime={readingTime}
                  methodology={methodology}
                  whyThisExists={whyThisExists}
                />
              </header>

              <div className="blog-content article-body">
                <MDXRemote
                  source={content}
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

              <div className="mt-16 pt-8 border-t border-slate-200">
                <Link
                  href="/compare"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm shadow-slate-900/5 hover:text-slate-900 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  All comparisons
                </Link>
              </div>
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
  const postsDirectory = path.join(process.cwd(), 'src/content/compare');

  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const filenames = fs.readdirSync(postsDirectory);

  return filenames
    .filter(filename => filename.endsWith('.mdx'))
    .map(filename => ({
      slug: filename.replace('.mdx', ''),
    }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: 'Comparison Not Found',
    };
  }

  const siteUrl = getSiteUrl();
  const frontmatterRecord = post.frontmatter as Record<string, unknown>;
  const articleUpdatedAt = getUpdatedAt(frontmatterRecord) ?? post.frontmatter.publishedAt

  return {
    title: `${post.frontmatter.title} - Skylos`,
    description: post.frontmatter.excerpt,
    keywords: Array.isArray(post.frontmatter.keywords) ? post.frontmatter.keywords : undefined,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.excerpt,
      type: 'article',
      publishedTime: post.frontmatter.publishedAt,
      modifiedTime: articleUpdatedAt,
      url: `${siteUrl}/compare/${slug}`,
      siteName: 'Skylos',
      images: [{ url: `${siteUrl}/og.png`, width: 1200, height: 630, alt: post.frontmatter.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.frontmatter.title,
      description: post.frontmatter.excerpt,
      images: [`${siteUrl}/og.png`],
    },
    alternates: {
      canonical: `${siteUrl}/compare/${slug}`,
    },
  };
}
