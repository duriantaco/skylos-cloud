import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In — Skylos',
  description: 'Sign in to Skylos to manage your projects, scans, and security policies.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
