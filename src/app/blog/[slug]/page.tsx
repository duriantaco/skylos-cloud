import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Clock, ChevronRight } from 'lucide-react';
import dogImg from "../../../../public/assets/favicon-96x96.png";
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { extractHeadings, estimateReadingTime } from '@/lib/toc';
import TableOfContents from '@/components/TableOfContents';
import '../blog.css';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  const filePath = path.join(process.cwd(), 'src/content/blog', `${slug}.mdx`);
  
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
  appsec: 'bg-purple-100 text-purple-700 border-purple-200',
  devtools: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const { frontmatter, content } = post;
  const headings = extractHeadings(content);
  const readingTime = estimateReadingTime(content);

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: frontmatter.title,
    description: frontmatter.excerpt,
    datePublished: frontmatter.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'Skylos',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Skylos',
      logo: {
        '@type': 'ImageObject',
        url: 'https://skylos.dev/assets/favicon-96x96.png',
      },
    },
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-white">
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
                priority
              />
              Skylos
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                Beta
              </span>
            </Link>
            
            <div className="flex items-center gap-6">
              <Link href="/blog" className="text-sm text-slate-900 font-medium">
                Blog
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
        <div className="border-b border-slate-100 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/" className="text-slate-500 hover:text-slate-900 transition">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <Link href="/blog" className="text-slate-500 hover:text-slate-900 transition">
                Blog
              </Link>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-900 font-medium truncate">{frontmatter.title}</span>
            </nav>
          </div>
        </div>

        {/* Article with sidebar */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-[1fr_250px] gap-12">
            {/* Main content */}
            <article className="min-w-0">
              {/* Back button */}
              <Link 
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-8 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to blog
              </Link>

              {/* Header */}
              <header className="mb-12">
                {/* Tags */}
                {frontmatter.tags && frontmatter.tags.length > 0 && (
                  <div className="flex gap-2 mb-6">
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

                {/* Title */}
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                  {frontmatter.title}
                </h1>

                {/* Meta */}
                <div className="flex items-center gap-4 text-sm text-slate-500 pb-8 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <time dateTime={frontmatter.publishedAt}>
                      {new Date(frontmatter.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{readingTime} min read</span>
                  </div>
                </div>
              </header>

              {/* Content */}
              <div className="blog-content">
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

              {/* Footer */}
              <div className="mt-16 pt-8 border-t border-slate-200">
                <Link 
                  href="/blog"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to all posts
                </Link>
              </div>
            </article>

            {/* Table of Contents Sidebar */}
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
  const postsDirectory = path.join(process.cwd(), 'src/content/blog');
  
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
      title: 'Post Not Found',
    };
  }

  const siteUrl = 'https://skylos.dev';

  return {
    title: `${post.frontmatter.title} - Skylos Blog`,
    description: post.frontmatter.excerpt,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.excerpt,
      type: 'article',
      publishedTime: post.frontmatter.publishedAt,
      url: `${siteUrl}/blog/${slug}`,
      siteName: 'Skylos',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.frontmatter.title,
      description: post.frontmatter.excerpt,
    },
    alternates: {
      canonical: `${siteUrl}/blog/${slug}`,
    },
  };
}