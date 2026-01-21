import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'
import fs from 'fs'
import path from 'path'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const now = new Date()

  const postsDirectory = path.join(process.cwd(), 'src/content/blog')
  const blogPosts = fs.existsSync(postsDirectory)
    ? fs.readdirSync(postsDirectory)
        .filter(f => f.endsWith('.mdx'))
        .map(f => ({
          url: `${siteUrl}/blog/${f.replace('.mdx', '')}`,
          lastModified: now,
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }))
    : []

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...blogPosts,
    { url: `${siteUrl}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]
}