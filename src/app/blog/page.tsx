import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import Image from 'next/image';
import dogImg from "../../../public/assets/favicon-96x96.png";
import BlogList from '@/components/BlogList';
import { estimateReadingTime } from '@/lib/toc';
import { getAuthorMeta, getUpdatedAt } from '@/lib/content-meta';

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  authorName: string;
  tags: string[];
  readingTime: number;
}

function getPosts(): Post[] {
  const postsDirectory = path.join(process.cwd(), 'src/content/blog');

  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const filenames = fs.readdirSync(postsDirectory);

  const posts = filenames
    .filter(filename => filename.endsWith('.mdx'))
    .map(filename => {
      const filePath = path.join(postsDirectory, filename);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);
      const frontmatterRecord = data as Record<string, unknown>;
      const author = getAuthorMeta(frontmatterRecord);

      return {
        slug: filename.replace('.mdx', ''),
        title: data.title,
        excerpt: data.excerpt,
        publishedAt: data.publishedAt,
        updatedAt: getUpdatedAt(frontmatterRecord),
        authorName: author.name,
        tags: data.tags || [],
        readingTime: estimateReadingTime(content),
      };
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return posts;
}

export default function BlogPage() {
  const posts = getPosts();

  return (
    <div className="min-h-screen bg-slate-50">
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

      {/* Hero Section */}
      <div className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-5">
            Blog
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Insights on application security, static analysis, and building tools that developers actually want to use
          </p>
        </div>
      </div>

      {/* Blog List with Search and Filtering */}
      <BlogList posts={posts} />
    </div>
  );
}

export const metadata = {
  title: 'Python Security & Static Analysis Blog - Skylos',
  description: 'Practical guides on Python security scanning, dead code detection, SAST tool comparisons, and securing AI-generated code. Real benchmarks, real code examples.',
  keywords: [
    'python security blog',
    'python static analysis guide',
    'SAST best practices python',
    'dead code detection python',
    'AI generated code security',
    'python vulnerability scanner',
    'semgrep bandit comparison',
  ],
  openGraph: {
    title: 'Python Security & Static Analysis Blog - Skylos',
    description: 'Practical guides on Python security, dead code detection, and AI code scanning.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Python Security & Static Analysis Blog - Skylos',
    description: 'Practical guides on Python security, dead code detection, and AI code scanning.',
  },
  alternates: {
    canonical: '/blog',
  },
};
