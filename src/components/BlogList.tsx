'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, Search } from 'lucide-react';

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  tags: string[];
  readingTime?: number;
}

interface BlogListProps {
  posts: Post[];
}

const tagColors: Record<string, string> = {
  security: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  sast: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  appsec: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  devtools: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
  python: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
  'code quality': 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
  'dead code': 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
};

function estimateReadingTime(excerpt: string): number {
  // Rough estimate: 200 words per minute, excerpt is ~10% of article
  const words = excerpt.split(' ').length;
  const estimatedTotalWords = words * 10;
  return Math.max(1, Math.round(estimatedTotalWords / 200));
}

export default function BlogList({ posts }: BlogListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach(post => {
      post.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [posts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = searchQuery === '' ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag = selectedTag === null || post.tags.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [posts, searchQuery, selectedTag]);

  const featuredPost = filteredPosts[0];
  const regularPosts = filteredPosts.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Search and Filter Section */}
      <div className="mb-10 space-y-6">
        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
          />
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 text-sm font-semibold rounded-full border transition ${
                selectedTag === null
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              All posts
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`px-4 py-2 text-sm font-semibold rounded-full border transition ${
                  selectedTag === tag
                    ? tagColors[tag.toLowerCase()] || tagColors.default
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Results count */}
        <p className="text-center text-sm text-slate-500">
          {filteredPosts.length === posts.length
            ? `${posts.length} ${posts.length === 1 ? 'article' : 'articles'}`
            : `${filteredPosts.length} of ${posts.length} articles`}
        </p>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center">
          <p className="text-slate-500 mb-2">No articles found</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedTag(null);
            }}
            className="text-sm text-slate-700 font-medium hover:text-slate-900"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Featured Post */}
          {featuredPost && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                Latest Article
              </h2>
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group block bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-xl transition-all"
              >
                <div className="p-8 md:p-10">
                  {/* Tags */}
                  {featuredPost.tags.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {featuredPost.tags.map(tag => (
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
                  <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 group-hover:text-slate-700 transition">
                    {featuredPost.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-lg text-slate-600 mb-6 leading-relaxed line-clamp-3">
                    {featuredPost.excerpt}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-5 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <time>
                          {new Date(featuredPost.publishedAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </time>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{estimateReadingTime(featuredPost.excerpt)} min read</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900 group-hover:gap-3 transition-all">
                      Read article
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Regular Posts Grid */}
          {regularPosts.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                More Articles
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularPosts.map(post => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all"
                  >
                    <div className="p-6">
                      {/* Tags */}
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

                      {/* Title */}
                      <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-slate-700 transition line-clamp-2">
                        {post.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed text-sm">
                        {post.excerpt}
                      </p>

                      {/* Meta */}
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
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{estimateReadingTime(post.excerpt)} min</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-sm font-medium text-slate-900 group-hover:gap-2 transition-all">
                          Read
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
