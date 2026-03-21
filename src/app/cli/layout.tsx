import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CLI Connect — Skylos',
  description: 'Connect the Skylos CLI to your account and project.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function CliLayout({ children }: { children: React.ReactNode }) {
  return children
}
