export type AuthorMeta = {
  name: string
  role?: string
  type: 'Person' | 'Organization'
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

export function getUpdatedAt(frontmatter: Record<string, unknown>): string | undefined {
  const updatedAt = frontmatter.updatedAt
  return typeof updatedAt === 'string' && updatedAt.trim().length > 0 ? updatedAt : undefined
}

export function getAuthorMeta(frontmatter: Record<string, unknown>): AuthorMeta {
  const author = frontmatter.author

  if (typeof author === 'string' && author.trim().length > 0) {
    return {
      name: author.trim(),
      type: 'Person',
    }
  }

  const authorRecord = asRecord(author)
  if (authorRecord) {
    const name =
      typeof authorRecord.name === 'string' && authorRecord.name.trim().length > 0
        ? authorRecord.name.trim()
        : 'Skylos team'
    const role =
      typeof authorRecord.role === 'string' && authorRecord.role.trim().length > 0
        ? authorRecord.role.trim()
        : undefined
    const type = authorRecord.type === 'Organization' || name === 'Skylos team'
      ? 'Organization'
      : 'Person'

    return { name, role, type }
  }

  return {
    name: 'Skylos team',
    role: 'Product engineering and research',
    type: 'Organization',
  }
}

export function getMethodology(frontmatter: Record<string, unknown>): string[] {
  const methodology = frontmatter.methodology
  if (!Array.isArray(methodology)) {
    return []
  }

  return methodology.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export function getWhyThisExists(frontmatter: Record<string, unknown>): string | undefined {
  const whyThisExists = frontmatter.whyThisExists
  return typeof whyThisExists === 'string' && whyThisExists.trim().length > 0
    ? whyThisExists.trim()
    : undefined
}
