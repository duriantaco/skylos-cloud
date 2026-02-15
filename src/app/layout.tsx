import type { Metadata, Viewport } from 'next'
// REMOVED: Unused Inter/JetBrains imports to save load time
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { getSiteUrl } from '@/lib/site'
import 'highlight.js/styles/github-dark.css';
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
    default: 'Skylos — Catch dead code, secrets, and risky patterns before merge',
    template: '%s | Skylos', // Changed '·' to '|' (Standard practice, saves 1 char)
  },
  description:
    'Skylos scans your repo locally or in CI/PR checks to catch dead code, hardcoded secrets, and dangerous patterns before they ship.',
  applicationName: 'Skylos',
  keywords: [
    'static analysis',
    'SAST',
    'python security',
    'code scanning',
    'dead code',
    'secrets scanning',
    'devsecops',
    'CI/CD',
  ],
  alternates: {
    canonical: './', 
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Skylos',
    title: 'Skylos — Static analysis that blocks risky merges',
    description:
      'Catch dead code, hardcoded secrets, and dangerous patterns before they ship. Run locally or in CI/PRs.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Skylos Dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skylos — Static analysis that blocks risky merges',
    description:
      'Catch dead code, hardcoded secrets, and dangerous patterns before they ship. Run locally or in CI/PRs.',
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
  icons: { icon: '/assets/favicon.svg' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}