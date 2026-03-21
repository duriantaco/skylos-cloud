import { getCollectionEntries } from '@/lib/content';
import { getSiteUrl } from '@/lib/site';

export async function GET() {
  const siteUrl = getSiteUrl();
  const posts = getCollectionEntries('blog');

  const items = posts
    .map(
      (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${new URL(post.canonicalUrl, siteUrl).toString()}</link>
      <guid isPermaLink="true">${new URL(post.canonicalUrl, siteUrl).toString()}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
${post.tags.map((tag) => `      <category>${tag}</category>`).join('\n')}
    </item>`
    )
    .join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Skylos Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Research-backed guides on Python security, GitHub Actions hardening, dead code detection, and AI-generated code review.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
