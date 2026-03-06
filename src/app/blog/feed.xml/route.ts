import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getSiteUrl } from '@/lib/site';

export async function GET() {
  const siteUrl = getSiteUrl();
  const postsDirectory = path.join(process.cwd(), 'src/content/blog');

  let items = '';

  if (fs.existsSync(postsDirectory)) {
    const posts = fs
      .readdirSync(postsDirectory)
      .filter((f) => f.endsWith('.mdx'))
      .map((filename) => {
        const filePath = path.join(postsDirectory, filename);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContents);
        return {
          slug: filename.replace('.mdx', ''),
          title: data.title || '',
          excerpt: data.excerpt || '',
          publishedAt: data.publishedAt || '',
          tags: (data.tags || []) as string[],
        };
      })
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

    items = posts
      .map(
        (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
${post.tags.map((t) => `      <category>${t}</category>`).join('\n')}
    </item>`
      )
      .join('\n');
  }

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Skylos Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Insights on Python security, static analysis, dead code detection, and developer tools.</description>
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
