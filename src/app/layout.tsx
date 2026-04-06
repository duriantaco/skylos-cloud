import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
// REMOVED: Unused Inter/JetBrains imports to save load time
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { getSiteUrl } from '@/lib/site'
import { buildWebsiteSchema } from '@/lib/structured-data'
import MarketingAttributionTrackerLoader from '@/components/MarketingAttributionTrackerLoader'
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
    default: 'Skylos — AI Code Security for Python',
    template: '%s | Skylos',
  },
  description:
    'Open source AI code security for Python teams shipping with Cursor, Copilot, and Claude Code. Catch dead code, risky patterns, and removed auth, CSRF, or rate-limit controls before merge.',
  applicationName: 'Skylos',
  category: 'developer tools',
  keywords: [
    'ai code security',
    'ai generated code security python',
    'python SAST',
    'python security scanner',
    'dead code detection python',
    'secure ai code review',
    'python secrets scanner',
    'removed auth decorator detection',
    'semgrep alternative python',
    'vulture alternative',
    'python code quality',
    'python security scanner github actions',
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
    title: 'Skylos — AI Code Security for Python',
    description:
      'Catch dead code, AI-generated mistakes, and removed security controls before merge.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Skylos — AI Code Security for Python' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skylos — AI Code Security for Python',
    description:
      'Catch dead code, AI-generated mistakes, and removed security controls before merge.',
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
  description: 'Open source AI code security for Python teams. Finds dead code, risky patterns, and removed security controls during AI-assisted refactors.',
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
  description: 'Open source AI code security for Python teams. Catch dead code, risky patterns, and removed security controls before merge.',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <MarketingAttributionTrackerLoader />
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
