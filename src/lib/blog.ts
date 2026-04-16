import { BlogArticleType, BlogTopic, ContentEntry } from '@/lib/content'

export const BLOG_ARTICLE_TYPES: BlogArticleType[] = [
  'Guide',
  'Benchmark',
  'Case Study',
  'Comparison',
  'Research',
]

export const BLOG_TOPICS: BlogTopic[] = [
  'Python Static Analysis',
  'AI Code Security',
  'Dead Code Detection',
  'CI Hardening',
  'Developer Workflow',
]

export const BLOG_FRAMEWORKS = ['Django', 'FastAPI', 'Flask', 'VS Code'] as const

export type BlogCtaConfig = {
  eyebrow: string
  title: string
  description: string
  primary: {
    href: string
    label: string
  }
  secondary?: {
    href: string
    label: string
  }
}

export function getBlogCta(post: ContentEntry): BlogCtaConfig {
  if (post.articleType === 'Benchmark' || post.articleType === 'Comparison') {
    return {
      eyebrow: 'Compare your options',
      title: 'See how Skylos stacks up on your repo',
      description:
        'Benchmarks are useful, but the real decision point is whether the signal holds on your codebase and in your CI flow.',
      primary: { href: '/compare', label: 'Compare tools' },
      secondary: { href: '/docs/getting-started', label: 'Run Skylos locally' },
    }
  }

  if (post.topic === 'CI Hardening') {
    return {
      eyebrow: 'Use it in CI',
      title: 'Turn this into a pull-request gate',
      description:
        'Set Skylos up in GitHub Actions so security, dead code, and AI-regression checks run on every PR instead of after review.',
      primary: { href: '/use-cases/python-security-github-actions', label: 'See the GitHub Actions workflow' },
      secondary: { href: '/docs/getting-started', label: 'Install Skylos' },
    }
  }

  if (post.topic === 'AI Code Security') {
    return {
      eyebrow: 'Review AI-generated code',
      title: 'Catch AI-introduced regressions before they land',
      description:
        'Run Skylos locally or in CI to surface hallucinated imports, removed auth checks, secrets, and risky defaults in AI-generated diffs.',
      primary: { href: '/docs/getting-started', label: 'Run Skylos on your repo' },
      secondary: { href: '/use-cases/ai-security-regressions-in-prs', label: 'See the AI PR workflow' },
    }
  }

  return {
    eyebrow: 'Try it on real code',
    title: 'Run Skylos on your repository',
    description:
      'Use Skylos locally first, then wire it into CI once the signal looks right on your framework and code patterns.',
    primary: { href: '/docs/getting-started', label: 'Install Skylos' },
    secondary: { href: '/compare', label: 'See comparison pages' },
  }
}

function sharedCount(a: string[], b: string[]) {
  const right = new Set(b)
  return a.reduce((count, item) => count + (right.has(item) ? 1 : 0), 0)
}

export function getRelatedBlogPosts(currentPost: ContentEntry, entries: ContentEntry[], limit = 3) {
  return entries
    .filter((entry) => entry.collection === 'blog' && entry.slug !== currentPost.slug)
    .map((entry) => {
      let score = 0

      if (entry.topic && currentPost.topic && entry.topic === currentPost.topic) score += 5
      if (entry.articleType && currentPost.articleType && entry.articleType === currentPost.articleType) score += 2
      score += sharedCount(entry.frameworks, currentPost.frameworks) * 4
      score += sharedCount(entry.tags, currentPost.tags)

      return { entry, score }
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return new Date(right.entry.publishedAt).getTime() - new Date(left.entry.publishedAt).getTime()
    })
    .slice(0, limit)
    .map(({ entry }) => entry)
}

export function formatBlogDiscoveryLabel(post: ContentEntry) {
  if (post.articleType && post.topic) {
    return `${post.articleType} • ${post.topic}`
  }

  return post.articleType ?? post.topic ?? 'Article'
}
