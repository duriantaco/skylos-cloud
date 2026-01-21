import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar, Clock } from 'lucide-react';
import dogImg from "../../../public/assets/favicon-96x96.png";

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  tags: string[];
}

const tagColors: Record<string, string> = {
  security: 'bg-red-100 text-red-700 border-red-200',
  sast: 'bg-blue-100 text-blue-700 border-blue-200',
  appsec: 'bg-purple-100 text-purple-700 border-purple-200',
  devtools: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
};

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
      const { data } = matter(fileContents);

      return {
        slug: filename.replace('.mdx', ''),
        title: data.title,
        excerpt: data.excerpt,
        publishedAt: data.publishedAt,
        tags: data.tags || [],
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

      {/* Hero Section */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Blog
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Insights on application security, SAST, and building better developer tools
          </p>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {posts.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center">
            <p className="text-slate-500">No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {posts.map(post => (
              <Link 
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all"
              >
                <div className="p-6">
                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex gap-2 mb-3">
                        {post.tags.map(tag => (
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

                  {/* Title */}
                  <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-slate-700 transition line-clamp-2">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
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
                      Read more
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Blog - Skylos',
  description: 'Insights on application security, SAST, and building better developer tools',
};