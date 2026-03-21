import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free GitHub Repo Security Scan for Python | Skylos',
  description:
    'Scan a public GitHub repository for Python security issues, hardcoded secrets, dead code, and code quality risks with Skylos.',
  keywords: [
    'github repo security scan',
    'python security scan',
    'scan github repository for vulnerabilities',
    'python dead code scanner',
    'github secrets scanner python',
    'ai generated code security scan',
  ],
  alternates: {
    canonical: '/scan',
  },
  openGraph: {
    title: 'Free GitHub Repo Security Scan for Python | Skylos',
    description:
      'Scan a public GitHub repository for Python security issues, hardcoded secrets, dead code, and code quality risks with Skylos.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free GitHub Repo Security Scan for Python | Skylos',
    description:
      'Scan a public GitHub repository for Python security issues, hardcoded secrets, dead code, and code quality risks with Skylos.',
  },
}

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return children
}
