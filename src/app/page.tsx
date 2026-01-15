import Link from 'next/link'
import Script from 'next/script'
import Navbar from '@/components/Navbar'
import CopyInstallButton from '@/components/CopyInstallButton'
// import SkylosHeroSandbox from '@/components/SkylosHeroSandbox'
import { getGithubRepo, getSiteUrl } from '@/lib/site'
import { ArrowRight, Terminal, Shield, AlertTriangle, Code2, GitBranch } from 'lucide-react'

async function getGithubStars(): Promise<number | null> {
  const repo = getGithubRepo()
  if (!repo) return null

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      next: { revalidate: 3600 },
      headers: {
        Accept: 'application/vnd.github+json',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { stargazers_count?: number }
    return typeof data.stargazers_count === 'number' ? data.stargazers_count : null
  } catch {
    return null
  }
}

export default async function Home() {
  const stars = await getGithubStars()
  const siteUrl = getSiteUrl()

  const faq = [
    {
      q: 'What exactly does Skylos do?',
      a: 'Skylos is a static analysis scanner. It finds dead code, hardcoded secrets, security risks, and quality issues in your repository—either locally or as CI/PR checks.',
    },
    {
      q: 'How do I get started?',
      a: 'Install the CLI with pip install skylos and run skylos . --danger --quality in your project. For PR gating, connect your GitHub repo.',
    },
    {
      q: 'Can I run it without GitHub?',
      a: 'Yes. Install the CLI and scan locally. Connect GitHub when you want automated PR checks and merge gating.',
    },
  ]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((x) => ({
      '@type': 'Question',
      name: x.q,
      acceptedAnswer: { '@type': 'Answer', text: x.a },
    })),
  }

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Skylos',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Windows, macOS, Linux',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: siteUrl,
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* JSON-LD */}
      <Script id="ld-product" type="application/ld+json">
        {JSON.stringify(productJsonLd)}
      </Script>
      <Script id="ld-faq" type="application/ld+json">
        {JSON.stringify(faqJsonLd)}
      </Script>

      {/* HERO */}
      <section className="relative overflow-hidden pt-32 md:pt-40 pb-24">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f020_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f020_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        {/* Decorative blurs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-red-100/50 rounded-full blur-3xl" />
        <div className="absolute top-32 right-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl" />

        {/* Floating category badges - left side */}
        <div className="hidden lg:block absolute left-[8%] top-1/3 space-y-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg shadow-slate-200/50 border border-slate-100 animate-float">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm font-medium text-slate-700">SQL Injection</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg shadow-slate-200/50 border border-slate-100 ml-6 animate-float-delayed">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm font-medium text-slate-700">Hardcoded Secrets</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg shadow-slate-200/50 border border-slate-100 animate-float">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-sm font-medium text-slate-700">Dead Code</span>
          </div>
        </div>

        {/* Floating category badges - right side */}
        <div className="hidden lg:block absolute right-[8%] top-1/3 space-y-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg shadow-slate-200/50 border border-slate-100 animate-float-delayed">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm font-medium text-slate-700">XSS Risks</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg shadow-slate-200/50 border border-slate-100 mr-6 animate-float">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-slate-700">Unused Imports</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg shadow-slate-200/50 border border-slate-100 animate-float-delayed">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-sm font-medium text-slate-700">Code Smells</span>
          </div>
        </div>


        {/* Content wrapper */}
        <div className="relative mx-auto max-w-7xl px-6">
          {/* Top badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-2 text-sm shadow-sm">
              <span className="flex items-center gap-1.5 text-slate-900 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                v1.0 live
              </span>
              {typeof stars === 'number' && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">⭐ {stars.toLocaleString()} stars</span>
                </>
              )}
            </div>
          </div>

          {/* HERO TEXT */}
          <div className="relative max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              Catch{" "}
              <span className="relative inline-block">
                <span className="relative z-10">bugs</span>
                <span className="absolute bottom-2 left-0 right-0 h-3 bg-red-200/60 -z-10 -rotate-1"></span>
              </span>{" "}
              before
              <br />
              they ship.
            </h1>

            <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Static analysis that finds dead code, hardcoded secrets, and security risks.
              <br className="hidden sm:block" />
              Run locally or gate your PRs.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-base font-semibold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
              >
                Connect GitHub
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <CopyInstallButton command="pip install skylos" />
            </div>

            <p className="mt-4 text-sm text-slate-500">Free for open source. No credit card required.</p>

            {/* Stats row */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">25+</div>
                <div className="text-sm text-slate-500">Detection rules</div>
              </div>
              <div className="hidden sm:block w-px h-10 bg-slate-200" />
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">&lt;3s</div>
                <div className="text-sm text-slate-500">Average scan</div>
              </div>
              <div className="hidden sm:block w-px h-10 bg-slate-200" />
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">0</div>
                <div className="text-sm text-slate-500">Config needed</div>
              </div>
            </div>
          </div>

          {/* SANDBOX DEMO */}
          {/* <div className="mt-20">
            <SkylosHeroSandbox />
          </div> */}
        </div>
      </section>


      {/* WHAT WE FIND - Simple grid */}
      <section id="features" className="py-24 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              What Skylos finds
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Four categories. Zero noise.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Security</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                SQL injection, command injection, unsafe deserialization, and more risky patterns.
              </p>
            </div>

            <div className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Secrets</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Hardcoded API keys, tokens, passwords, and credentials that shouldn't be in code.
              </p>
            </div>

            <div className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <Code2 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Dead Code</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Unused imports, functions, classes, and variables cluttering your codebase.
              </p>
            </div>

            <div className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
                <Terminal className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Quality</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Code smells, complexity issues, and patterns that make code hard to maintain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              How it works
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Three steps. Under a minute.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-bold">
                1
              </div>
              <div className="pt-8 pl-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Install</h3>
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm text-slate-300">
                  <span className="text-emerald-400">$</span> pip install skylos
                </div>
                <p className="mt-4 text-slate-600">
                  Or connect GitHub for automated PR scanning.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-bold">
                2
              </div>
              <div className="pt-8 pl-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Scan</h3>
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm text-slate-300">
                  <span className="text-emerald-400">$</span> skylos . --danger --quality
                </div>
                <p className="mt-4 text-slate-600">
                  Get findings with file, line, and severity.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-bold">
                3
              </div>
              <div className="pt-8 pl-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Fix & Gate</h3>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <GitBranch className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">PR #142</span>
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      ✓ Gate passed
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-slate-600">
                  Block risky merges automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-white">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Simple pricing
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Free to start. Upgrade when you need PR gating.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <h3 className="text-xl font-semibold text-slate-900">Community</h3>
              <p className="mt-2 text-slate-600">For individuals and OSS</p>
              <div className="mt-6 text-5xl font-bold text-slate-900">$0</div>
              <ul className="mt-8 space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Unlimited local scans
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> All finding categories
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> CLI + JSON output
                </li>
              </ul>
              <Link
                href="/docs"
                className="mt-8 block w-full text-center rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50 transition"
              >
                Get started
              </Link>
            </div>

            <div className="rounded-2xl border-2 border-slate-900 bg-white p-8 relative">
              <div className="absolute -top-3 left-6 px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-full">
                Popular
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Pro</h3>
              <p className="mt-2 text-slate-600">For teams shipping fast</p>
              <div className="mt-6 text-5xl font-bold text-slate-900">
                $29<span className="text-lg font-normal text-slate-500">/mo</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Everything in Community
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> GitHub PR checks
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Quality gate thresholds
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Team dashboard
                </li>
              </ul>
              <Link
                href="/login"
                className="mt-8 block w-full text-center rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800 transition"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              FAQ
            </h2>
          </div>

          <div className="space-y-4">
            {faq.map((x) => (
              <details key={x.q} className="group rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer list-none p-6 font-semibold text-slate-900 flex items-center justify-between">
                  {x.q}
                  <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="px-6 pb-6 text-slate-600 -mt-2">{x.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Start scanning in 30 seconds
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            No config files. No setup wizards. Just results.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-base font-semibold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
            >
              Connect GitHub
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <CopyInstallButton command="pip install skylos" />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-12 bg-white">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Shield className="w-5 h-5" />
            <span className="font-semibold">Skylos</span>
            <span className="text-slate-400 ml-4">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <Link href="/docs" className="hover:text-slate-900 transition">Docs</Link>
            <Link href="/login" className="hover:text-slate-900 transition">Login</Link>
            <a href="mailto:hello@skylos.dev" className="hover:text-slate-900 transition">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  )
}