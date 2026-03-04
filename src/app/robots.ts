import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  return {
    rules: [{ userAgent: '*', allow: ['/', '/llms.txt', '/llms-full.txt', '/.well-known/'] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
