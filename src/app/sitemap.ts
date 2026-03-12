import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

type ContentSitemapEntry = {
  url: string
  lastModified: Date
  changeFrequency: 'monthly'
  priority: number
}

function getMdxEntries(
  dir: string,
  urlPrefix: string,
  priority: number,
): ContentSitemapEntry[] {
  const fullPath = path.join(process.cwd(), dir)
  if (!fs.existsSync(fullPath)) return []

  return fs.readdirSync(fullPath)
    .filter(fileName => fileName.endsWith('.mdx'))
    .map(fileName => {
      const filePath = path.join(fullPath, fileName)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const { data } = matter(fileContents)
      const slug = fileName.replace('.mdx', '')
      const frontmatterDate =
        typeof data.updatedAt === 'string'
          ? new Date(data.updatedAt)
          : typeof data.publishedAt === 'string'
            ? new Date(data.publishedAt)
            : null
      const fileModifiedAt = fs.statSync(filePath).mtime
      const lastModified =
        frontmatterDate && !Number.isNaN(frontmatterDate.getTime())
          ? frontmatterDate
          : fileModifiedAt

      return {
        url: `${urlPrefix}/${slug}`,
        lastModified,
        changeFrequency: 'monthly' as const,
        priority,
      }
    })
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const now = new Date()

  const blogPosts = getMdxEntries('src/content/blog', `${siteUrl}/blog`, 0.6)

  const comparePosts = getMdxEntries('src/content/compare', `${siteUrl}/compare`, 0.7)

  const useCasePosts = getMdxEntries('src/content/use-cases', `${siteUrl}/use-cases`, 0.7)

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...blogPosts,
    { url: `${siteUrl}/compare`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...comparePosts,
    { url: `${siteUrl}/use-cases`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...useCasePosts,
    { url: `${siteUrl}/roadmap`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/vscode`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/llms.txt`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/llms-full.txt`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
