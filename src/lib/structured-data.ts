import type { FAQItem, HowToStep } from '@/lib/content'

export type BreadcrumbItem = {
  name: string
  item: string
}

export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  }
}

export function buildFaqSchema(faq: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function buildHowToSchema(input: {
  name: string
  description: string
  url: string
  steps: HowToStep[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    url: input.url,
    step: input.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  }
}

export function buildItemListSchema(input: {
  name: string
  url: string
  items: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: input.name,
    url: input.url,
    itemListElement: input.items.map((name, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
    })),
  }
}

export function buildCollectionPageSchema(input: {
  name: string
  description: string
  url: string
  itemUrls: Array<{ name: string; url: string }>
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    description: input.description,
    url: input.url,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: input.itemUrls.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: item.url,
      })),
    },
  }
}

export function buildWebsiteSchema(input: {
  siteUrl: string
  name: string
  description: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.siteUrl,
    description: input.description,
  }
}
