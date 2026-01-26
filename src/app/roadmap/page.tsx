// app/roadmap/page.tsx
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Shield,
  Zap,
  GitBranch,
  AlertOctagon,
  Sparkles,
} from "lucide-react"
import dogImg from "../../../public/assets/favicon-96x96.png"

const ROADMAP = [
  {
    title: "Now (Shipping)",
    subtitle: "High-signal scanning + making Skylos feel instant",
    pill: "Now",
    items: [
      {
        icon: Shield,
        title: "Quality Gate v1",
        desc: "Fail/pass projects with consistent thresholds and simple summaries.",
        tag: "Core",
      },
      {
        icon: AlertOctagon,
        title: "Critical + new issues tracking",
        desc: "Surface danger_count + new_issues in every scan so teams can act fast.",
        tag: "Security",
      },
      {
        icon: Zap,
        title: "Faster scans + caching",
        desc: "Speed improvements with smarter file processing and cache reuse.",
        tag: "Performance",
      },
    ],
  },
  {
    title: "Next (4 to 6 weeks)",
    subtitle: "Workflow upgrades that make teams stick",
    pill: "Next",
    items: [
      {
        icon: GitBranch,
        title: "PR / Diff scanning",
        desc: "Only scan changed files + highlight what's newly introduced in this PR.",
        tag: "DevEx",
      },
      {
        icon: Sparkles,
        title: "Auto-fix suggestions",
        desc: "Generate safe, minimal patches with confidence gating (no risky rewrites).",
        tag: "AI",
      },
      {
        icon: Shield,
        title: "Compliance mapping",
        desc: "Map findings to OWASP / SOC2 / PCI style controls for reporting.",
        tag: "Compliance",
      },
    ],
  },
  {
    title: "Later (2 to 3 months)",
    subtitle: "From scanner → to continuous security assistant",
    pill: "Later",
    items: [
      {
        icon: CheckCircle,
        title: "Policy-as-code rules",
        desc: "Org-wide guardrails: what is allowed, what is blocked, what is warned.",
        tag: "Enterprise",
      },
      {
        icon: Clock,
        title: "Historical trends",
        desc: "Trendlines for risk over time: regressions, improvements, and hotspots.",
        tag: "Insights",
      },
      {
        icon: Shield,
        title: "Monorepo optimization",
        desc: "Parallel pipeline tuning for huge repos with predictable runtimes.",
        tag: "Scale",
      },
    ],
  },
]

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
      {children}
    </span>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
      {children}
    </span>
  )
}

export default function RoadmapPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar (matches your landing vibe) */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white">
              <Image
                src={dogImg}
                alt="Skylos"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </div>
            <span className="text-lg font-semibold text-slate-900">Skylos</span>
            <span className="ml-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Beta
            </span>
          </Link>

          <div className="hidden items-center gap-2 text-sm text-slate-600 md:flex">
            <Link href="/#features" className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-900 transition">
              Features
            </Link>
            <Link href="/#how" className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-900 transition">
              How it works
            </Link>
            <Link href="/#pricing" className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-900 transition">
              Pricing
            </Link>
            <Link href="/roadmap" className="rounded-lg px-3 py-2 bg-slate-100 text-slate-900">
              Roadmap
            </Link>
            <Link href="/blog" className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-900 transition">
              Blog
            </Link>
            <Link href="https://docs.skylos.dev/" className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-900 transition">
              Docs
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="https://docs.skylos.dev/"
              className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 transition sm:inline-flex"
            >
              View docs
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 pt-28 pb-16">
        <div className="mb-10">
          <Pill>Product Roadmap</Pill>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            What we're building next
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
            Skylos is laser-focused on high-signal SAST: less noise, faster scanning, and real
            workflows teams actually use. Here's what's shipping now and what's coming next.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Start scanning <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="https://docs.skylos.dev/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Read docs
            </Link>
          </div>
        </div>

        {/* Roadmap Columns */}
        <div className="grid gap-6 lg:grid-cols-3">
          {ROADMAP.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900">{section.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{section.subtitle}</div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border ${
                    section.pill === "Now"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : section.pill === "Next"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {section.pill}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.title}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4 hover:bg-white hover:border-slate-200 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200">
                          <Icon className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-slate-900">{item.title}</div>
                            <Tag>{item.tag}</Tag>
                          </div>
                          <div className="mt-1 text-sm text-slate-600">{item.desc}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-bold text-slate-900">Want something prioritized?</div>
              <div className="mt-1 text-sm text-slate-600">
                If you're building in a monorepo, need PR-only scans, or want stricter policy enforcement —
                we'll ship it with you.
              </div>
            </div>
            <Link
              href="https://docs.skylos.dev/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Contact / Docs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
