import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Skylos Docs, Quickstart & CLI Install',
  description: 'Read the Skylos getting started guide, installation steps, CLI usage, rules reference, and GitHub integration docs.',
  keywords: [
    'skylos docs',
    'skylos quickstart',
    'skylos cli install',
    'python static analysis docs',
    'python security scanner docs',
    'skylos rules reference',
  ],
  alternates: {
    canonical: 'https://docs.skylos.dev/',
  },
  openGraph: {
    title: 'Skylos Docs, Quickstart & CLI Install',
    description: 'Read the Skylos getting started guide, installation steps, CLI usage, rules reference, and GitHub integration docs.',
    url: 'https://docs.skylos.dev/',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Skylos Docs, Quickstart & CLI Install',
    description: 'Read the Skylos getting started guide, installation steps, CLI usage, rules reference, and GitHub integration docs.',
  },
}

export default function DocsPage() {
  permanentRedirect('https://docs.skylos.dev/')
}
