import type { MetadataRoute } from 'next'
import { getCollectionEntries } from '@/lib/content'
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

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const now = new Date()

  const blogPosts = getCollectionEntries('blog').map((post) =>
    toEntry(new URL(post.canonicalUrl, siteUrl).toString(), post.updatedAt ?? post.publishedAt, 0.65),
  )
  const comparePosts = getCollectionEntries('compare').map((post) =>
    toEntry(new URL(post.canonicalUrl, siteUrl).toString(), post.updatedAt ?? post.publishedAt, 0.75),
  )
  const useCasePosts = getCollectionEntries('use-cases').map((post) =>
    toEntry(new URL(post.canonicalUrl, siteUrl).toString(), post.updatedAt ?? post.publishedAt, 0.75),
  )

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    ...blogPosts,
    { url: `${siteUrl}/compare`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    ...comparePosts,
    { url: `${siteUrl}/use-cases`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    ...useCasePosts,
    { url: `${siteUrl}/roadmap`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/vscode`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${siteUrl}/llms.txt`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/llms-full.txt`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ]
}
