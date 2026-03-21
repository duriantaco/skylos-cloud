import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'
import { estimateReadingTime } from '@/lib/toc'
import { getAuthorMeta, getMethodology, getUpdatedAt, getWhyThisExists } from '@/lib/content-meta'

export type ContentCollection = 'blog' | 'compare' | 'use-cases'

export type FAQItem = {
  question: string
  answer: string
}

export type HowToStep = {
  name: string
  text: string
}

export type ContentEntry = {
  collection: ContentCollection
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  updatedAt?: string
  authorName: string
  authorRole?: string
  authorType: 'Person' | 'Organization'
  tags: string[]
  keywords: string[]
  canonicalUrl: string
  methodology: string[]
  whyThisExists?: string
  keyTakeaways: string[]
  faq: FAQItem[]
  howToSteps: HowToStep[]
  comparedItems: string[]
  readingTime: number
  content: string
}

type CollectionConfig = {
  dir: string
  urlPrefix: string
}

const COLLECTIONS: Record<ContentCollection, CollectionConfig> = {
  blog: {
    dir: 'src/content/blog',
    urlPrefix: '/blog',
  },
  compare: {
    dir: 'src/content/compare',
    urlPrefix: '/compare',
  },
  'use-cases': {
    dir: 'src/content/use-cases',
    urlPrefix: '/use-cases',
  },
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function asFaqItems(value: unknown): FAQItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return []
    }

    const record = item as Record<string, unknown>
    const question = typeof record.question === 'string' ? record.question.trim() : ''
    const answer = typeof record.answer === 'string' ? record.answer.trim() : ''

    if (!question || !answer) {
      return []
    }

    return [{ question, answer }]
  })
}

function asHowToSteps(value: unknown): HowToStep[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return []
    }

    const record = item as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    const text = typeof record.text === 'string' ? record.text.trim() : ''

    if (!name || !text) {
      return []
    }

    return [{ name, text }]
  })
}

function getCollectionConfig(collection: ContentCollection): CollectionConfig {
  return COLLECTIONS[collection]
}

function getCollectionDirectory(collection: ContentCollection): string {
  return path.join(process.cwd(), getCollectionConfig(collection).dir)
}

function toContentEntry(
  collection: ContentCollection,
  slug: string,
  fileContents: string,
): ContentEntry {
  const { data, content } = matter(fileContents)
  const frontmatter = data as Record<string, unknown>
  const author = getAuthorMeta(frontmatter)
  const collectionConfig = getCollectionConfig(collection)
  const canonicalUrl =
    typeof frontmatter.canonicalUrl === 'string' && frontmatter.canonicalUrl.trim().length > 0
      ? frontmatter.canonicalUrl.trim()
      : `${collectionConfig.urlPrefix}/${slug}`

  return {
    collection,
    slug,
    title: typeof frontmatter.title === 'string' ? frontmatter.title : slug,
    excerpt: typeof frontmatter.excerpt === 'string' ? frontmatter.excerpt : '',
    publishedAt: typeof frontmatter.publishedAt === 'string' ? frontmatter.publishedAt : '',
    updatedAt: getUpdatedAt(frontmatter),
    authorName: author.name,
    authorRole: author.role,
    authorType: author.type,
    tags: asStringArray(frontmatter.tags),
    keywords: asStringArray(frontmatter.keywords),
    canonicalUrl,
    methodology: getMethodology(frontmatter),
    whyThisExists: getWhyThisExists(frontmatter),
    keyTakeaways: asStringArray(frontmatter.keyTakeaways),
    faq: asFaqItems(frontmatter.faq),
    howToSteps: asHowToSteps(frontmatter.howToSteps),
    comparedItems: asStringArray(frontmatter.comparedItems),
    readingTime: estimateReadingTime(content),
    content,
  }
}

export function getContentEntry(collection: ContentCollection, slug: string): ContentEntry | null {
  const filePath = path.join(getCollectionDirectory(collection), `${slug}.mdx`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContents = fs.readFileSync(filePath, 'utf8')
  return toContentEntry(collection, slug, fileContents)
}

export function getCollectionEntries(collection: ContentCollection): ContentEntry[] {
  const directory = getCollectionDirectory(collection)

  if (!fs.existsSync(directory)) {
    return []
  }

  return fs.readdirSync(directory)
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace('.mdx', '')
      const filePath = path.join(directory, fileName)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      return toContentEntry(collection, slug, fileContents)
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
}

export function getAllPublicContentEntries(): ContentEntry[] {
  return [
    ...getCollectionEntries('blog'),
    ...getCollectionEntries('compare'),
    ...getCollectionEntries('use-cases'),
  ]
}

export function getCollectionStaticParams(collection: ContentCollection): Array<{ slug: string }> {
  return getCollectionEntries(collection).map((entry) => ({ slug: entry.slug }))
}
