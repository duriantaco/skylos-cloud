'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, RefreshCw, Rss, Search, Sparkles } from 'lucide-react';
import type { BlogArticleType, BlogTopic } from '@/lib/content';
import { BLOG_ARTICLE_TYPES, BLOG_TOPICS, formatBlogDiscoveryLabel } from '@/lib/blog';

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  authorName: string;
  tags: string[];
  keywords: string[];
  keyTakeaways: string[];
  readingTime: number;
  articleType?: BlogArticleType;
  topic?: BlogTopic;
  frameworks: string[];
  featuredReason?: string;
}

interface BlogListProps {
  posts: Post[];
}

type DiscoveryPath = {
  id: string;
  title: string;
  description: string;
  topic?: string;
  format?: string;
};

const discoveryPaths: DiscoveryPath[] = [
  {
    id: 'python-static-analysis',
    title: 'Python SAST',
    description: 'Comparison pages, scanner tradeoffs, and framework-specific coverage guides.',
    topic: 'Python Static Analysis',
  },
  {
    id: 'ai-code-security',
    title: 'AI Code Security',
    description: 'Hallucinated imports, AI PR review, provenance, and regression detection.',
    topic: 'AI Code Security',
  },
  {
    id: 'framework-guides',
    title: 'Framework Guides',
    description: 'Django, FastAPI, Flask, and Python app patterns that change scanner signal.',
    format: 'Guide',
  },
  {
    id: 'benchmarks',
    title: 'Benchmarks',
    description: 'Real repo scans, tool comparisons, merged PRs, and benchmark-style evidence.',
    format: 'Benchmark',
  },
] as const;

function formatDate(date: string, short = false) {
  return new Date(date).toLocaleDateString('en-US', {
    month: short ? 'short' : 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BlogList({ posts }: BlogListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);

  const allFrameworks = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((post) => {
      post.frameworks.forEach((framework) => set.add(framework));
    });
    return Array.from(set).sort();
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return posts.filter((post) => {
      const searchable = [
        post.title,
        post.excerpt,
        post.authorName,
        post.articleType ?? '',
        post.topic ?? '',
        ...post.tags,
        ...post.keywords,
        ...post.frameworks,
        ...post.keyTakeaways,
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = query.length === 0 || searchable.includes(query);
      const matchesTopic = selectedTopic === null || post.topic === selectedTopic;
      const matchesFormat =
        selectedFormat === null ||
        (selectedFormat === 'Benchmark'
          ? post.articleType === 'Benchmark' || post.articleType === 'Case Study'
          : post.articleType === selectedFormat);
      const matchesFramework =
        selectedFramework === null || post.frameworks.includes(selectedFramework);

      return matchesQuery && matchesTopic && matchesFormat && matchesFramework;
    });
  }, [posts, searchQuery, selectedTopic, selectedFormat, selectedFramework]);

  const featuredPost = filteredPosts[0];
  const regularPosts = filteredPosts.slice(1);

  const activeFilterCount = [selectedTopic, selectedFormat, selectedFramework].filter(Boolean).length + (searchQuery.trim() ? 1 : 0);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTopic(null);
    setSelectedFormat(null);
    setSelectedFramework(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pb-16">
      <section className="-mt-8 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_32px_100px_-70px_rgba(15,23,42,0.45)] backdrop-blur-xl md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Start here</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Explore the blog by job, not just by publish date
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">
              Use these paths when you already know what you need: compare scanners, review AI-generated code, understand framework-specific signal, or dig into proof-heavy benchmarks.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Link
              href="/compare"
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
            >
              <div className="text-sm font-semibold text-slate-900">Compare pages</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">Go straight to vendor and tool comparisons.</p>
            </Link>
            <Link
              href="/blog/feed.xml"
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
            >
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Rss className="h-4 w-4" />
                RSS feed
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">Follow new research and framework guides in your reader.</p>
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {discoveryPaths.map((path) => {
            const count = posts.filter((post) => {
              if (path.topic) return post.topic === path.topic;
              if (path.format === 'Benchmark') return post.articleType === 'Benchmark' || post.articleType === 'Case Study';
              return post.articleType === path.format;
            }).length;

            return (
              <button
                key={path.id}
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFramework(null);
                  setSelectedTopic(path.topic ?? null);
                  setSelectedFormat(path.format ?? null);
                }}
                className="group rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-white"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  {count} articles
                </div>
                <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900">{path.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{path.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition group-hover:gap-3">
                  Open this path
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-70px_rgba(15,23,42,0.4)] md:p-7">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by topic, framework, tool, or vulnerability pattern..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
            <span className="text-sm text-slate-500">
              {filteredPosts.length === posts.length
                ? `${posts.length} articles`
                : `${filteredPosts.length} of ${posts.length} articles`}
            </span>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Topic</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedTopic === null ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                All topics
              </button>
              {BLOG_TOPICS.filter((topic) => posts.some((post) => post.topic === topic)).map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedTopic(topic === selectedTopic ? null : topic)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selectedTopic === topic ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Format</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFormat(null)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selectedFormat === null ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  All formats
                </button>
                {BLOG_ARTICLE_TYPES.filter((format) => posts.some((post) => post.articleType === format)).map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => setSelectedFormat(format === selectedFormat ? null : format)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      selectedFormat === format ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Framework</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFramework(null)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selectedFramework === null ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  All frameworks
                </button>
                {allFrameworks.map((framework) => (
                  <button
                    key={framework}
                    type="button"
                    onClick={() => setSelectedFramework(framework === selectedFramework ? null : framework)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      selectedFramework === framework ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {framework}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {filteredPosts.length === 0 ? (
        <div className="mt-10 rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-slate-900">No articles match this filter set.</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Clear the filters or switch to another topic path to keep exploring the library.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Reset discovery
          </button>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {featuredPost ? (
            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    {activeFilterCount > 0 ? 'Top match' : 'Featured article'}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                    {activeFilterCount > 0 ? 'Best fit for your current filters' : 'Start with this article'}
                  </h2>
                </div>
              </div>

              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group block rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_32px_100px_-70px_rgba(15,23,42,0.45)] transition hover:border-slate-300 hover:shadow-[0_40px_110px_-70px_rgba(15,23,42,0.48)] md:p-8"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                    {formatBlogDiscoveryLabel(featuredPost)}
                  </span>
                  {featuredPost.frameworks.map((framework) => (
                    <span
                      key={framework}
                      className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700"
                    >
                      {framework}
                    </span>
                  ))}
                </div>

                <h3 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 transition group-hover:text-slate-700 md:text-4xl">
                  {featuredPost.title}
                </h3>

                <p className="mt-4 text-lg leading-relaxed text-slate-600">{featuredPost.excerpt}</p>

                <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Why this is worth your time
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {activeFilterCount > 0
                      ? 'This article is the best match for your current filters and search context.'
                      : featuredPost.featuredReason ?? featuredPost.keyTakeaways[0] ?? featuredPost.excerpt}
                  </p>
                </div>

                {featuredPost.keyTakeaways.length > 0 ? (
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {featuredPost.keyTakeaways.slice(0, 3).map((takeaway) => (
                      <div key={takeaway} className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4">
                        <p className="text-sm leading-relaxed text-slate-700">{takeaway}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(featuredPost.publishedAt)}
                    </span>
                    {featuredPost.updatedAt && featuredPost.updatedAt !== featuredPost.publishedAt ? (
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Updated {formatDate(featuredPost.updatedAt)}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {featuredPost.readingTime} min read
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-2 text-base font-semibold text-slate-900 transition group-hover:gap-3">
                    Read article
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </div>
              </Link>
            </section>
          ) : null}

          {regularPosts.length > 0 ? (
            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Library</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Keep exploring</h2>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {regularPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-65px_rgba(15,23,42,0.38)] transition hover:border-slate-300 hover:shadow-[0_32px_100px_-65px_rgba(15,23,42,0.42)]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                        {formatBlogDiscoveryLabel(post)}
                      </span>
                      {post.frameworks.slice(0, 1).map((framework) => (
                        <span
                          key={framework}
                          className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700"
                        >
                          {framework}
                        </span>
                      ))}
                    </div>

                    <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900 transition group-hover:text-slate-700">
                      {post.title}
                    </h3>

                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {post.keyTakeaways[0] ?? post.excerpt}
                    </p>

                    <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        What you&apos;ll get
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {post.featuredReason ?? post.excerpt}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {formatDate(post.publishedAt, true)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {post.readingTime} min
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 transition group-hover:gap-2">
                        Read
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
