import type { MetadataRoute } from 'next'
import { getCollectionEntries } from '@/lib/content'
import { getJudgeRepoSitemapEntries } from '@/lib/judge'
import { getSiteUrl } from '@/lib/site'

type ContentSitemapEntry = {
  url: string
  lastModified: Date
  changeFrequency: 'monthly'
  priority: number
}

function toEntry(pathname: string, date: string | Date, priority: number): ContentSitemapEntry {
  return {
    url: pathname,
    lastModified: typeof date === 'string' ? new Date(date) : date,
    changeFrequency: 'monthly',
    priority,
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const now = new Date()
  const judgeRepos = await getJudgeRepoSitemapEntries().catch(() => [])

  const blogPosts = getCollectionEntries('blog').map((post) =>
    toEntry(new URL(post.canonicalUrl, siteUrl).toString(), post.updatedAt ?? post.publishedAt, 0.65),
  )
  const comparePosts = getCollectionEntries('compare').map((post) =>
    toEntry(new URL(post.canonicalUrl, siteUrl).toString(), post.updatedAt ?? post.publishedAt, 0.75),
  )
  const useCasePosts = getCollectionEntries('use-cases').map((post) =>
    toEntry(new URL(post.canonicalUrl, siteUrl).toString(), post.updatedAt ?? post.publishedAt, 0.75),
  )
  const judgeEntries = judgeRepos.map((repo) =>
    toEntry(
      `${siteUrl}/judge/${repo.owner}/${repo.name}`,
      repo.lastScannedAt ?? now,
      0.8,
    ),
  )

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    ...blogPosts,
    { url: `${siteUrl}/compare`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    ...comparePosts,
    { url: `${siteUrl}/use-cases`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    ...useCasePosts,
    { url: `${siteUrl}/judge`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    ...judgeEntries,
    { url: `${siteUrl}/roadmap`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/vscode`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${siteUrl}/llms.txt`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/llms-full.txt`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ]
}
