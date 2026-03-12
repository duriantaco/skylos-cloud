import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
// REMOVED: Unused Inter/JetBrains imports to save load time
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { getSiteUrl } from '@/lib/site'
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
    'Open source Python SAST tool that finds dead code, hardcoded secrets, SQL injection, and AI-generated code problems. Runs locally, in CI/CD, and as a GitHub Action.',
  applicationName: 'Skylos',
  keywords: [
    'python static analysis',
    'python SAST',
    'python security scanner',
    'dead code detection python',
    'python secrets scanner',
    'AI generated code scanner',
    'semgrep alternative python',
    'vulture alternative',
    'python code quality',
    'GitHub Action python security',
    'devsecops python',
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
    title: 'Skylos — Python Static Analysis & Security Scanner',
    description:
      'Open source Python SAST tool. Detect dead code, secrets, SQL injection, and AI code problems. Run locally or in CI.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Skylos — Python Static Analysis Tool' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skylos — Python Static Analysis & Security Scanner',
    description:
      'Open source Python SAST tool. Detect dead code, secrets, SQL injection, and AI code problems. Run locally or in CI.',
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
  // TODO: Add your Google Search Console verification code here
  // verification: {
  //   google: 'YOUR_GSC_VERIFICATION_CODE',
  // },
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
        {children}
      </body>
    </html>
  );
}