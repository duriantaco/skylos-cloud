import Link from 'next/link';
import Image from 'next/image';
import dogImg from "../../../public/assets/favicon-96x96.png";
import BlogList from '@/components/BlogList';
import { getCollectionEntries } from '@/lib/content';
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
    readingTime: post.readingTime,
  }));

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

      <div className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-5">
            Python Security and Static Analysis Blog
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Benchmarks, comparison pages, GitHub Actions hardening guides, and AI code review workflows for Python teams that want lower-noise static analysis.
          </p>
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
