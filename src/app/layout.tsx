import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
// REMOVED: Unused Inter/JetBrains imports to save load time
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { getSiteUrl } from '@/lib/site'
import { buildWebsiteSchema } from '@/lib/structured-data'
import './globals.css'; // kept only one instance

const siteUrl = getSiteUrl()

export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Skylos — Python Static Analysis, Security Scanner & Dead Code Detection',
    template: '%s | Skylos',
  },
  description:
    'Open source Python static analysis and security scanner for dead code, hardcoded secrets, GitHub Actions, and AI-generated code review.',
  applicationName: 'Skylos',
  category: 'developer tools',
  keywords: [
    'python static analysis',
    'python SAST',
    'python security scanner',
    'dead code detection python',
    'python secrets scanner',
    'python security scanner github actions',
    'secure github actions python',
    'AI generated code security python',
    'semgrep alternative python',
    'vulture alternative',
    'python code quality',
    'python linting deprecated vscode',
  ],
  alternates: {
    canonical: siteUrl,
    types: {
      'application/rss+xml': `${siteUrl}/blog/feed.xml`,
    },
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Skylos',
    title: 'Skylos — Python Static Analysis, Security Scanner & Dead Code Detection',
    description:
      'Open source Python static analysis and security scanner for dead code, secrets, GitHub Actions, and AI-generated code review.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Skylos — Python Static Analysis Tool' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skylos — Python Static Analysis, Security Scanner & Dead Code Detection',
    description:
      'Open source Python static analysis and security scanner for dead code, secrets, GitHub Actions, and AI-generated code review.',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: { icon: '/assets/favicon-96x96.png' },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Skylos',
  url: siteUrl,
  logo: `${siteUrl}/assets/favicon-96x96.png`,
  description: 'Open source Python static analysis and SAST tool. Finds dead code, hardcoded secrets, SQL injection, and security vulnerabilities. Alternative to Semgrep, Bandit, and Vulture for Python teams.',
  sameAs: [
    'https://github.com/duriantaco/skylos',
    'https://pypi.org/project/skylos/',
    'https://x.com/realpython/status/1984455367913279547',
  ],
  foundingDate: '2025',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'founder@skylos.dev',
    contactType: 'sales',
  },
}

const websiteJsonLd = buildWebsiteSchema({
  siteUrl,
  name: 'Skylos',
  description: 'Open source Python static analysis and security scanner for dead code, GitHub Actions, and AI-generated code review.',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <Script
          id="ld-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Script
          id="ld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
