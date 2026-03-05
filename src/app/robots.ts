import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  return {
    rules: [{
      userAgent: '*',
      allow: ['/', '/llms.txt', '/llms-full.txt', '/.well-known/'],
      disallow: ['/dashboard/', '/api/', '/login/', '/scan/', '/cli/'],
    }],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
