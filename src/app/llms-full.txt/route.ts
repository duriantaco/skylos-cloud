import { buildLlmsFullContent } from '@/lib/llms'
import { getSiteUrl } from '@/lib/site'

export function GET() {
  const content = buildLlmsFullContent(getSiteUrl())

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
