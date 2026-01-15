function normalizeUrl(input: string): string {
  const u = input.trim().replace(/\/+$/, '')

  if (/^https?:\/\//i.test(u)) 
    return u

  const isLocal =
    u.startsWith('localhost') ||
    u.startsWith('127.0.0.1') ||
    /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(u)

  return `${isLocal ? 'http' : 'https'}://${u}`
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) 
    return normalizeUrl(explicit)

  const vercel = process.env.VERCEL_URL
  if (vercel) 
    return normalizeUrl(vercel)

  return 'http://localhost:3000'
}

export function getGithubRepo(): string | null {
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO?.trim()
  if (!repo) 
    return null
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) 
    return null
  return repo
}
