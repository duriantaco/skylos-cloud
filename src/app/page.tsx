import Link from 'next/link'
import Script from 'next/script'
import { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import CopyInstallButton from '@/components/CopyInstallButton'
import SkylosHeroSandbox from '@/components/SkylosHeroSandbox'
import { getGithubRepo, getSiteUrl } from '@/lib/site'
import { ArrowRight, Terminal, Shield, AlertTriangle, Code2, GitBranch, Timer, Search, Check, Zap, Bug, BookOpen } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Skylos | Python Static Analysis, Security Scanner & Dead Code Detection',
  description: 'Open source Python static analysis and security scanner for dead code, hardcoded secrets, GitHub Actions hardening, and AI-generated code review. Framework-aware for Django, Flask, FastAPI, and Pydantic.',
  keywords: [
    'python static analysis tool',
    'python security scanner',
    'python SAST tool',
    'dead code detection python',
    'python secrets scanner',
    'vulture alternative',
    'semgrep alternative python',
    'bandit alternative',
    'ai generated code security python',
    'python security scanner github actions',
    'secure github actions python',
    'python linting deprecated vscode',
    'FastAPI dead code detection',
    'Django security scanner',
    'Flask static analysis',
    'python CI security scanning',
  ],
  openGraph: {
    title: 'Skylos — Python Static Analysis, Security Scanner & Dead Code Detection',
    description: 'Open source Python static analysis and security scanner for dead code, secrets, GitHub Actions hardening, and AI-generated code review.',
    type: 'website',
  },
}

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

function BenchmarkSection() {
  return (
    <section className="py-24 bg-white border-t border-slate-200" id="benchmark">
      <div className="mx-auto max-w-7xl px-6">
        
        {/* SEO Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Benchmark: Skylos vs Vulture
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
            We tested both tools against a realistic <strong>FastAPI + Pydantic</strong> codebase seeded with known dead code. 
            The goal: Measure detection accuracy in a modern Python stack.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12">
          
          {/* LEFT: The Narrative (SEO Content) */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-slate-500" />
                Test Methodology
              </h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                We ran both tools on a standard service architecture containing:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5" />
                  <strong>29 seeded bugs:</strong> Unused imports, functions, and variables.
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5" />
                  <strong>Framework magic:</strong> FastAPI routers, Pydantic models, and Pytest fixtures (which often trigger false positives).
                </li>
              </ul>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-2">The Takeaway</h4>
              <p className="text-sm text-slate-600 mb-4">
                Vulture is faster (0.1s) but &quot;dumb&quot;: it missed 17% of the dead code and flagged used code as dead.
              </p>
              <p className="text-sm text-slate-600">
                <strong>Skylos found 100% of the dead code</strong> with higher precision, taking ~1.6s to parse the full AST context.
              </p>
            </div>
          </div>

          {/* RIGHT: The Raw Data (Proof) */}
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">Metric</th>
                    <th className="px-6 py-4 text-emerald-700 bg-emerald-50/50 border-b-2 border-emerald-500">Skylos</th>
                    <th className="px-6 py-4">Vulture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Row 1: True Positives */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">True Positives</div>
                      <div className="text-xs text-slate-500">Correctly found dead code</div>
                    </td>
                    <td className="px-6 py-4 bg-emerald-50/10 font-bold text-emerald-700">29 / 29</td>
                    <td className="px-6 py-4 text-slate-600">24 / 29</td>
                  </tr>

                  {/* Row 2: False Negatives (The Killer Stat) */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">False Negatives</div>
                      <div className="text-xs text-slate-500">Missed bugs (Lower is better)</div>
                    </td>
                    <td className="px-6 py-4 bg-emerald-50/10 font-bold text-emerald-700">0</td>
                    <td className="px-6 py-4 text-red-600 font-medium flex items-center gap-2">
                      5 <AlertTriangle className="w-3 h-3" />
                    </td>
                  </tr>

                  {/* Row 3: Precision */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">Precision</div>
                      <div className="text-xs text-slate-500">Accuracy of findings</div>
                    </td>
                    <td className="px-6 py-4 bg-emerald-50/10">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-700">70.7%</span>
                        <div className="w-16 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="w-[70%] h-full bg-emerald-500" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">50.0%</span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="w-[50%] h-full bg-slate-400" />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Row 4: Recall */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">Recall</div>
                      <div className="text-xs text-slate-500">Detection rate</div>
                    </td>
                    <td className="px-6 py-4 bg-emerald-50/10">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-700">100%</span>
                        <div className="w-16 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="w-full h-full bg-emerald-500" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">82.8%</span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="w-[82%] h-full bg-slate-400" />
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr className="bg-slate-50/50 text-xs">
                    <td className="px-6 py-3 font-medium text-slate-500 flex items-center gap-2">
                      <Timer className="w-3 h-3" /> Execution Time
                    </td>
                    <td className="px-6 py-3 text-slate-500 font-mono">1.67s</td>
                    <td className="px-6 py-3 text-slate-500 font-mono">0.10s</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              * Benchmark data collected Feb 2026 on Apple Silicon M3.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default async function Home() {
  const stars = await getGithubStars()
  const siteUrl = getSiteUrl()
  const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/Hm5KQMzyrR"
  const docsUrl = 'https://docs.skylos.dev/'
  const rulesReferenceUrl = 'https://docs.skylos.dev/rules-reference'

  const faq = [
    {
      q: 'How does Skylos detect hardcoded secrets?',
      a: 'Skylos scans your codebase and git history using entropy analysis and pattern matching to find API keys, tokens, and passwords before they are pushed to production.',
    },
    {
      q: 'Why does Skylos take ~1.5s compared to Vulture?',
      a: 'Vulture scans text (regex). Skylos scans logic (AST). We trade 1 second of computer time to save you hours of human time triage. We filter out false positives from FastAPI routes, Pydantic models, and Pytest fixtures automatically.',
    },
    {
      q: 'Is this a replacement for SonarQube or Snyk?',
      a: 'Skylos is a lightweight, zero-config alternative focused specifically on Python. Unlike heavy enterprise SAST tools, Skylos runs in <3 seconds and is designed for immediate feedback in local CLI and PR checks.',
    },
    {
      q: 'Can I automate Python security checks in GitHub Actions?',
      a: 'Yes. Skylos is designed for CI/CD. You can use it to gate pull requests, ensuring no dead code or security vulnerabilities merge into your main branch.',
    },
  ]

  // --- SEO: 3. JSON-LD for Rich Snippets ---
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((x) => ({
      '@type': 'Question',
      name: x.q,
      acceptedAnswer: { '@type': 'Answer', text: x.a },
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Features', item: `${siteUrl}/#features` },
      { '@type': 'ListItem', position: 3, name: 'Pricing', item: `${siteUrl}/#pricing` },
      { '@type': 'ListItem', position: 4, name: 'Blog', item: `${siteUrl}/blog` },
      { '@type': 'ListItem', position: 5, name: 'Docs', item: docsUrl },
    ],
  }

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Skylos',
    applicationCategory: 'SecurityApplication', 
    operatingSystem: 'Windows, macOS, Linux',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'A static analysis security tool (SAST) for finding risks and dead code in Python applications.',
    url: siteUrl,
    featureList: [
      'Secret Scanning',
      'SQL Injection Detection',
      'Dead Code Removal',
      'CI/CD Quality Gate'
    ]
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <Script id="ld-product" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <Script id="ld-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Script id="ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* HERO SECTION */}
      <section aria-label="Skylos Introduction" className="relative overflow-hidden pt-32 md:pt-40 pb-32">
        {/* Enhanced Background with Animated Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/30" />

        {/* Animated Grid Pattern - Much more visible */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#64748b33_1px,transparent_1px),linear-gradient(to_bottom,#64748b33_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

        <div className="relative mx-auto max-w-7xl px-6">
          {/* Version Badge with Enhanced Animation */}
          <div className="flex justify-center mb-12 animate-fade-in">
            <a
              href="https://github.com/duriantaco/skylos/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 rounded-full border border-slate-200/50 bg-white/60 backdrop-blur-xl px-5 py-2.5 text-sm shadow-lg shadow-slate-900/5 hover:border-slate-300/50 hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <span className="flex items-center gap-2 text-slate-900 font-semibold">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
                </span>
                v1.0 live
              </span>
              {typeof stars === 'number' && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <span className="group-hover:scale-125 transition-transform inline-block">⭐</span>
                    {stars.toLocaleString()} stars
                  </span>
                </>
              )}
            </a>
          </div>

          {/* Hero Title - Clean & Professional */}
          <div className="relative max-w-5xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.02] animate-fade-in-up">
              <span className="block text-slate-900">Framework-aware</span>
              <span className="block mt-2 text-slate-900">
                <span className="relative inline-block">
                  Python
                  <span className="absolute bottom-2 left-0 right-0 h-4 bg-blue-400/35 -z-10 -rotate-1"></span>
                </span>
                {' '}static analysis
              </span>
            </h1>

            {/* Enhanced Subtitle */}
            <p className="mt-8 text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed animate-fade-in-up [animation-delay:200ms] font-medium">
              Find dead code, security issues, and AI-generated code mistakes before merge.
              <br className="hidden sm:block" />
              <span className="text-slate-500">Run locally, in GitHub Actions, or inside VS Code.</span>
            </p>

            {/* Enhanced CTA Buttons */}
            <div className="mt-12 flex flex-col sm:flex-row gap-5 justify-center items-center animate-fade-in-up [animation-delay:400ms]">
              <Link
                href="/docs"
                className="group relative inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-10 py-5 text-lg font-bold text-white hover:shadow-2xl hover:shadow-slate-900/40 hover:scale-105 transition-all duration-300 overflow-hidden"
                aria-label="Install Skylos CLI"
              >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                <span className="relative z-10 flex items-center gap-2">
                  Install CLI
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>

              <Link
                href="#example-output"
                className="group relative inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white/80 backdrop-blur-sm px-10 py-5 text-lg font-bold text-slate-900 hover:border-slate-300 hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                See example output
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:text-slate-900 transition-all" />
              </Link>

              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-8 py-4 text-base font-semibold text-slate-900 hover:border-slate-300 hover:bg-white transition-all"
              >
                Connect GitHub
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="mt-6 flex justify-center animate-fade-in-up [animation-delay:500ms]">
              <CopyInstallButton command="pip install skylos" />
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500 animate-fade-in-up [animation-delay:600ms]">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Open source CLI</span>
              </div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-500" />
                <span>Docs and quickstart live</span>
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-500" />
                <span>Local scans or GitHub PR gates</span>
              </div>
            </div>
          </div>

          <div className="mt-16 md:mt-20" id="example-output">
            <SkylosHeroSandbox />
          </div>
        </div>
      </section>

      <section id="proof" className="relative py-20 bg-gradient-to-b from-white to-slate-50 border-y border-slate-200 overflow-hidden">
        {/* Background Accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-purple-50/50" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Proof before promises
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              These numbers come from benchmarks, case studies, and reproducible scans already published on the site.
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            <a href="#benchmark" className="group rounded-2xl border border-slate-200 bg-white p-7 hover:border-slate-300 hover:shadow-xl transition-all">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">FastAPI benchmark</div>
              <div className="mt-4 text-4xl font-black text-slate-900">29/29</div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Seeded dead-code findings caught</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                FastAPI + Pydantic benchmark on Apple Silicon M3. Skylos reached 100% recall and 70.7% precision.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                See benchmark <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>

            <Link href="/blog/flask-dead-code-case-study" className="group rounded-2xl border border-slate-200 bg-white p-7 hover:border-slate-300 hover:shadow-xl transition-all">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Flask case study</div>
              <div className="mt-4 text-4xl font-black text-slate-900">21x</div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Fewer false positives than Vulture</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Manual review on Flask found 7/7 dead items, with 12 false positives instead of 260.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                Read case study <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link href="/blog/we-scanned-9-popular-python-libraries" className="group rounded-2xl border border-slate-200 bg-white p-7 hover:border-slate-300 hover:shadow-xl transition-all">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Repository scan</div>
              <div className="mt-4 text-4xl font-black text-slate-900">9 repos</div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Scanned without cherry-picking</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                FastAPI, Flask, Pydantic, Requests, Rich and more: 1,800 security findings, 4,195 quality issues, and 730 dead code items.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                Review the scan <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link href="/use-cases/ai-generated-code-security" className="group rounded-2xl border border-slate-200 bg-white p-7 hover:border-slate-300 hover:shadow-xl transition-all">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">AI workflow</div>
              <div className="mt-4 text-4xl font-black text-slate-900">13 checks</div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">AI code risk coverage</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Catch hallucinated imports, phantom calls, hardcoded secrets, and missing AI safety controls before merge.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                See AI workflow <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </section>


      <section id="features" className="py-24 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              What Skylos checks
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Framework-aware analysis for dead code, secrets, vulnerabilities, and AI-generated code mistakes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <article className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Vulnerability Scanner</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Prevent <strong>SQL injection</strong>, XSS, and command injection attacks by catching unsafe patterns in your code.
              </p>
            </article>

            <article className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-amber-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Secret Detection</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Stop data leaks. Skylos finds <strong>hardcoded API keys</strong>, tokens, and passwords in your source code commits.
              </p>
            </article>

            <article className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <Code2 className="w-6 h-6 text-blue-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Dead Code Removal</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Clean your technical debt. Identify <strong>unused imports</strong>, functions, and unreachable variables automatically.
              </p>
            </article>

            <article className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
                <Terminal className="w-6 h-6 text-purple-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Quality Gate</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Enforce coding standards and reduce complexity with automated <strong>quality checks</strong> in your CI pipeline.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* DEMO VIDEO */}
      <section className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              See It in Action
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Watch how Skylos scans your codebase and integrates into your CI/CD pipeline.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{paddingBottom: '56.25%'}}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/dElKFn7cj2Q"
              title="Skylos Agentic CI/CD Pipeline Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">What people are saying</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Loved by developers
            </h2>
          </div>

          <div className="flex gap-5 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Tryolabs - Top Python Libraries 2025 */}
            <a
              href="https://tryolabs.com/blog/top-python-libraries-2025"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-none w-[340px] snap-start rounded-2xl border border-slate-200 bg-white p-7 hover:border-slate-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">T</div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">Tryolabs</div>
                  <div className="text-xs text-slate-500">Top Python Libraries 2025</div>
                </div>
              </div>
              <blockquote className="text-slate-700 text-sm leading-relaxed">
                &ldquo;Skylos assigns <strong>confidence scores (0&ndash;100)</strong> to its findings&hellip; particularly useful for framework code like Flask routes, Django models, or FastAPI endpoints that may appear unused but are actually invoked externally.&rdquo;
              </blockquote>
              <p className="mt-4 text-xs text-slate-400 group-hover:text-slate-500 transition">Read on Tryolabs &rarr;</p>
            </a>

            {/* LinkedIn - Banias */}
            <a
              href="https://www.linkedin.com/posts/banias_dead-code-in-production-codebases-costs-engineering-activity-7417128380447490049-xQZp/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-none w-[340px] snap-start rounded-2xl border border-slate-200 bg-white p-7 hover:border-slate-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-sm font-bold">in</div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">Banias Baabe</div>
                  <div className="text-xs text-slate-500">LinkedIn</div>
                </div>
              </div>
              <blockquote className="text-slate-700 text-sm leading-relaxed">
                &ldquo;Skylos is a static analysis tool that detects unused Python code with <strong>higher accuracy than existing solutions</strong>. Identifies unused functions, classes, methods, and imports that Flake8, Pylint, and Vulture miss.&rdquo;
              </blockquote>
              <p className="mt-4 text-xs text-slate-400 group-hover:text-slate-500 transition">View on LinkedIn &rarr;</p>
            </a>

            {/* Reddit - r/Python */}
            <a
              href="https://www.reddit.com/r/Python/comments/1p0wck6/skylos_code_quality_library/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-none w-[340px] snap-start rounded-2xl border border-slate-200 bg-white p-7 hover:border-slate-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#FF4500] flex items-center justify-center text-white text-sm font-bold">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">r/Python</div>
                  <div className="text-xs text-slate-500">33 upvotes</div>
                </div>
              </div>
              <blockquote className="text-slate-700 text-sm leading-relaxed">
                &ldquo;This looks really useful! Having quality issues + secrets bundled in is nice. Does it handle <strong>dynamic imports</strong> well?&rdquo;
              </blockquote>
              <p className="mt-4 text-xs text-slate-400 group-hover:text-slate-500 transition">View on Reddit &rarr;</p>
            </a>

            {/* DEV Community */}
            <a
              href="https://dev.to/djinn-soul/-mastering-python-code-quality-a-no-nonsense-guide-to-tools-that-actually-prevent-technical-debt-21b2"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-none w-[340px] snap-start rounded-2xl border border-slate-200 bg-white p-7 hover:border-slate-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold">D</div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">DEV Community</div>
                  <div className="text-xs text-slate-500">Python Code Quality Guide</div>
                </div>
              </div>
              <blockquote className="text-slate-700 text-sm leading-relaxed">
                &ldquo;Sniffs out unused code <em>and</em> security smells before they fester. It&rsquo;s <strong>proactive pruning with a safety net.</strong>&rdquo;
              </blockquote>
              <p className="mt-4 text-xs text-slate-400 group-hover:text-slate-500 transition">Read on DEV &rarr;</p>
            </a>

            {/* Real Python on X */}
            <a
              href="https://x.com/realpython/status/1984455367913279547"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-none w-[340px] snap-start rounded-2xl border border-slate-200 bg-white p-7 hover:border-slate-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#1DA1F2] flex items-center justify-center text-white text-sm font-bold">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">Real Python</div>
                  <div className="text-xs text-slate-500">@realpython</div>
                </div>
              </div>
              <blockquote className="text-slate-700 text-sm leading-relaxed">
                &ldquo;skylos: Detect Dead Code&rdquo;
                <span className="block mt-2 text-sm text-slate-500">Shared to 500K+ Python developers</span>
              </blockquote>
              <p className="mt-4 text-xs text-slate-400 group-hover:text-slate-500 transition">View on X &rarr;</p>
            </a>

            {/* DEV Community - Comparison */}
            <a
              href="https://dev.to/djinn-soul/-mastering-python-code-quality-a-no-nonsense-guide-to-tools-that-actually-prevent-technical-debt-21b2"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-none w-[340px] snap-start rounded-2xl border border-slate-200 bg-white p-7 hover:border-slate-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold">D</div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">DEV Community</div>
                  <div className="text-xs text-slate-500">Tool Comparison Guide</div>
                </div>
              </div>
              <blockquote className="text-slate-700 text-sm leading-relaxed">
                &ldquo;Skylos <strong>shines in hybrid dead-code/security scans</strong>&mdash;think catching unused funcs that leak secrets.&rdquo;
              </blockquote>
              <p className="mt-4 text-xs text-slate-400 group-hover:text-slate-500 transition">Read on DEV &rarr;</p>
            </a>
          </div>

          {/* GitHub Stars Banner */}
          <div className="mt-10 flex justify-center">
            <a
              href="https://github.com/duriantaco/skylos"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-8 py-5 hover:border-slate-300 hover:shadow-lg transition-all"
            >
              <svg className="w-8 h-8 text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              <div>
                <div className="text-sm text-slate-500">Open source on GitHub</div>
                <div className="text-2xl font-bold text-slate-900 group-hover:text-slate-700 transition">
                  {typeof stars === 'number' ? `${stars.toLocaleString()} stars` : '300+ stars'}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      <BenchmarkSection />

      <section id="how" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Integrate in Seconds
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Build a secure DevSecOps pipeline in three steps.
            </p>
          </div>
          
           <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-bold">
                1
              </div>
              <div className="pt-8 pl-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Install CLI</h3>
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
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Run Analysis</h3>
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm text-slate-300">
                  <span className="text-emerald-400">$</span> skylos . --danger --quality --upload
                </div>
                <p className="mt-4 text-slate-600">
                  Upload to the dashboard for gate status, suppressions, and history.
                  <span className="block text-sm text-slate-500 mt-1">
                    Local only: <span className="font-mono">skylos . --danger --quality</span>
                  </span>
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

      {/* RESOURCES / SEO SECTION */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Guides, Comparisons & Use Cases
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Learn how Python teams use Skylos for security scanning, dead code detection, secure GitHub Actions, and AI-generated code review.
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-8">
            {/* Use Cases */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-5">
                <Search className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Use Cases</h3>
              <ul className="space-y-3 text-sm text-slate-600 mb-6">
                <li>
                  <Link href="/use-cases/detect-dead-code-python" className="hover:text-slate-900 transition underline decoration-slate-300 hover:decoration-slate-900">
                    How to detect dead code in Python
                  </Link>
                </li>
                <li>
                  <Link href="/use-cases/ai-generated-code-security" className="hover:text-slate-900 transition underline decoration-slate-300 hover:decoration-slate-900">
                    Catch hallucinated imports in AI code
                  </Link>
                </li>
                <li>
                  <Link href="/use-cases/secure-github-actions-python" className="hover:text-slate-900 transition underline decoration-slate-300 hover:decoration-slate-900">
                    Secure GitHub Actions for Python
                  </Link>
                </li>
              </ul>
              <Link href="/use-cases" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:gap-2 transition-all">
                All use cases <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Comparisons */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mb-5">
                <Code2 className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Tool Comparisons</h3>
              <ul className="space-y-3 text-sm text-slate-600 mb-6">
                <li>
                  <Link href="/compare/bandit-vs-codeql-vs-semgrep-python" className="hover:text-slate-900 transition underline decoration-slate-300 hover:decoration-slate-900">
                    Bandit vs CodeQL vs Semgrep for Python
                  </Link>
                </li>
                <li>
                  <Link href="/compare/semgrep-vs-skylos" className="hover:text-slate-900 transition underline decoration-slate-300 hover:decoration-slate-900">
                    Semgrep vs Skylos for Python
                  </Link>
                </li>
                <li>
                  <Link href="/compare/best-python-sast-tools-2026" className="hover:text-slate-900 transition underline decoration-slate-300 hover:decoration-slate-900">
                    Best Python SAST tools in 2026
                  </Link>
                </li>
              </ul>
              <Link href="/compare" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:gap-2 transition-all">
                All comparisons <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Blog */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-5">
                <Bug className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Latest from the Blog</h3>
              <ul className="space-y-3 text-sm text-slate-600 mb-6">
                <li>
                  <Link href="/blog/python-linting-deprecated-vscode" className="hover:text-slate-900 transition underline decoration-slate-300 hover:decoration-slate-900">
                    `python.linting` is deprecated in VS Code
                  </Link>
                </li>
                <li>
                  <Link href="/blog/we-scanned-9-popular-python-libraries" className="hover:text-slate-900 transition underline decoration-slate-300 hover:decoration-slate-900">
                    We scanned 9 popular Python libraries
                  </Link>
                </li>
                <li>
                  <Link href="/blog/dead-code-security-liability" className="hover:text-slate-900 transition underline decoration-slate-300 hover:decoration-slate-900">
                    Dead code is a security liability
                  </Link>
                </li>
              </ul>
              <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:gap-2 transition-all">
                All articles <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-5">
                <BookOpen className="w-6 h-6 text-amber-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Docs & Reference</h3>
              <ul className="space-y-3 text-sm text-slate-600 mb-6">
                <li>
                  <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition underline decoration-slate-300 hover:decoration-slate-900">
                    Install Skylos and run your first scan
                  </a>
                </li>
                <li>
                  <a href={rulesReferenceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition underline decoration-slate-300 hover:decoration-slate-900">
                    Browse the Skylos rules reference
                  </a>
                </li>
                <li>
                  <Link href="/vscode" className="hover:text-slate-900 transition underline decoration-slate-300 hover:decoration-slate-900">
                    Set up Skylos in VS Code
                  </Link>
                </li>
              </ul>
              <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:gap-2 transition-all">
                Read the docs <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Frequently Asked Questions
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

      <section className="py-24 bg-white border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Open source locally. Use cloud when you need workflow.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              The CLI works without login. Credits apply when you upload scans, compare history, or run AI-assisted cloud actions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
              <div className="text-sm font-semibold text-slate-900">OSS CLI</div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Best for trying Skylos on a repo today.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-900">pip install skylos</code>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Local scans, JSON output, and SARIF
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> No login required
                </li>
              </ul>
              <Link href="/docs" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                Install locally <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="text-sm font-semibold text-slate-900">Cloud dashboard</div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Best for history, suppressions, scan compare, and shared visibility.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Upload scans for trends, history, and triage
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Shared findings, suppressions, and exports
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Credits used for uploads and AI-assisted workflows
                </li>
              </ul>
              <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                Connect a repo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
              <div className="text-sm font-semibold text-slate-900">GitHub and teams</div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Best once the local scan is already useful and you want repeatable enforcement.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> PR gates, inline comments, and scan comparison
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Slack or Discord notifications and team workflows
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Compliance reports, governance, and higher limits
                </li>
              </ul>
              <Link href="/use-cases/python-security-github-actions" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                See CI setup <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Credits for cloud workflows
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Local CLI scans stay free. Buy credits when you want uploads, history, PR automation, or AI-assisted actions. No subscriptions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Pay as you go */}
            <div className="rounded-2xl border-2 border-slate-900 bg-white p-8 flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold">
                  <Zap className="w-3 h-3" /> Most Popular
                </span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Cloud workflow</h3>
              <p className="mt-2 text-slate-600 text-sm">Buy credits when you need shared history and automation</p>
              <div className="mt-6">
                <span className="text-5xl font-bold text-slate-900">$9</span>
                <span className="text-slate-500 text-sm ml-1">/ 500 credits</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm text-slate-600 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Local CLI stays free and unlimited
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Upload scans to the dashboard
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Scan compare, trends, and finding history
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Inline PR comments and team collaboration
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Slack and Discord notifications
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> AI triage, PR auto-fix, and compliance reports
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Credits never expire
                </li>
              </ul>
              <Link
                href="/login"
                className="mt-8 block w-full text-center rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800 transition"
              >
                Connect GitHub
              </Link>
              <p className="mt-3 text-center text-xs text-slate-500">Starts with credits, then grows with usage.</p>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-8 flex flex-col">
              <h3 className="text-xl font-semibold text-slate-900">Team and enterprise</h3>
              <p className="mt-2 text-slate-600 text-sm">For higher limits, rollout help, and procurement</p>
              <div className="mt-6">
                <span className="text-3xl font-bold text-slate-900">Custom</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm text-slate-600 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Everything in Cloud workflow
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Unlimited credits
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> More projects, scans, and longer history
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Advanced gates, exports, and compliance reports
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Shared workspace, integrations, and governance
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Contact for rollout support and procurement
                </li>
              </ul>
              <a
                href="mailto:founder@skylos.dev"
                className="mt-8 group block w-full text-center rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50 transition"
              >
                Book a Demo <ArrowRight className="w-4 h-4 inline group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Try it locally first
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Run the CLI on a repo, then connect GitHub when you want PR gates and shared history.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/docs"
              className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-base font-semibold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
            >
              Install CLI
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="#proof"
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-900 hover:bg-slate-50 transition-all"
            >
              See proof
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-8 py-4 text-base font-semibold text-slate-900 hover:bg-white transition-all"
            >
              Connect GitHub
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
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
            <Link href="/blog" className="hover:text-slate-900 transition">Blog</Link>
            <Link href="/compare" className="hover:text-slate-900 transition">Compare</Link>
            <Link href="/use-cases" className="hover:text-slate-900 transition">Use Cases</Link>
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition">Docs</a>
            <Link href="/login" className="hover:text-slate-900 transition">Login</Link>
            <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition">Discord</a>
            <a href="mailto:founder@skylos.dev" className="hover:text-slate-900 transition">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
