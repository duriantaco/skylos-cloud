import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { getSiteUrl } from '@/lib/site'
import 'highlight.js/styles/github-dark.css';
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

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
    template: '%s · Skylos',
  },
  description:
    'Skylos scans your repo locally or in CI/PR checks to catch dead code, hardcoded secrets, and dangerous patterns before they ship.',
  applicationName: 'Skylos',
  keywords: [
    'static analysis',
    'SAST',
    'code scanning',
    'dead code',
    'secrets scanning',
    'security',
    'CI',
    'pull request checks',
    'python',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Skylos',
    title: 'Skylos — Static analysis that blocks risky merges',
    description:
      'Catch dead code, hardcoded secrets, and dangerous patterns before they ship. Run locally or in CI/PRs.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Skylos' }],
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
  icons: { icon: '/favicon.ico' },
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
