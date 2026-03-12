import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Documentation — Skylos',
  description: 'Read the Skylos docs for quickstart, CLI setup, and GitHub integration guidance.',
  alternates: {
    canonical: 'https://docs.skylos.dev/',
  },
}

export default function DocsPage() {
  permanentRedirect('https://docs.skylos.dev/')
}
