import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  const disallow = ['/dashboard/', '/api/', '/login/', '/scan/', '/cli/']

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/llms.txt', '/llms-full.txt', '/.well-known/'],
        disallow,
      },
      { userAgent: 'Googlebot', allow: '/', disallow },
      { userAgent: 'Google-Extended', allow: '/', disallow },
      { userAgent: 'Bingbot', allow: '/', disallow },
      { userAgent: 'GPTBot', allow: '/', disallow },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow },
      { userAgent: 'ChatGPT-User', allow: '/', disallow },
      { userAgent: 'PerplexityBot', allow: '/', disallow },
      { userAgent: 'ClaudeBot', allow: '/', disallow },
      { userAgent: 'Claude-SearchBot', allow: '/', disallow },
      { userAgent: 'Claude-User', allow: '/', disallow },
      { userAgent: 'anthropic-ai', allow: '/', disallow },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
