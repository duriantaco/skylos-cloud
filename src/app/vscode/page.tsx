// app/vscode/page.tsx
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Download,
  Zap,
  Eye,
  Sparkles,
  Shield,
  Code2,
  RefreshCw,
  CheckCircle,
  Cpu,
} from "lucide-react"
import dogImg from "../../../public/assets/favicon-96x96.png"

const FEATURES = [
  {
    icon: Eye,
    title: "Real-time AI Analysis",
    desc: "Detects bugs as you type — no save required. Just pause and the AI reviews your code.",
  },
  {
    icon: Sparkles,
    title: "One-Click Fixes",
    desc: "CodeLens buttons appear on error lines. Click 'Fix with AI' and review the diff before applying.",
  },
  {
    icon: Cpu,
    title: "GPT-4 or Claude",
    desc: "Choose your AI provider. Works with OpenAI and Anthropic — use whichever you prefer.",
  },
  {
    icon: Zap,
    title: "Smart Caching",
    desc: "Only re-analyzes functions that actually changed. Fast, efficient, and won't burn your API credits.",
  },
  {
    icon: RefreshCw,
    title: "Streaming Responses",
    desc: "See fix progress in real-time as the AI generates code. No more waiting for spinners.",
  },
  {
    icon: Shield,
    title: "Secrets & Danger Scanning",
    desc: "Detects hardcoded API keys, eval/exec calls, unsafe pickle loads, and more.",
  },
]

const STATS = [
  { value: "2s", label: "Idle before scan" },
  { value: "60s", label: "Cache duration" },
  { value: "2", label: "AI providers" },
  { value: "0", label: "Data collected" },
]

function Pill({ children, color = "slate" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    slate: "border-slate-200 bg-white text-slate-600",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${colors[color]}`}>
      {children}
    </span>
  )
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm transition">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      <div className="mt-4 font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</div>
    </div>
  )
}

export default function VSCodePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar */}
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
            <Link href="/roadmap" className="rounded-lg px-3 py-2 hover:bg-slate-100 hover:text-slate-900 transition">
              Roadmap
            </Link>
            <Link href="/vscode" className="rounded-lg px-3 py-2 bg-slate-100 text-slate-900">
              VS Code
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

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-28 pb-16">
        <div className="flex flex-col items-center text-center">
          <Pill color="violet">VS Code Extension</Pill>
          
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            AI that watches your code
            <br />
            <span className="text-slate-400">as you type</span>
          </h1>
          
          <p className="mt-5 max-w-2xl text-base text-slate-600 md:text-lg">
            Real-time bug detection powered by GPT-4 or Claude. No save required — just type, pause, 
            and see issues appear. One-click fixes with diff preview.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="https://marketplace.visualstudio.com/items?itemName=oha.skylos-vscode-extension"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#007ACC] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#006BB3] transition shadow-lg shadow-blue-500/20"
            >
              <Download className="h-4 w-4" />
              Install on VS Code
            </Link>
            <Link
              href="https://github.com/oha/skylos"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Code2 className="h-4 w-4" />
              View on GitHub
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Free & open source · Works with Python · Requires API key for AI features
          </p>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
    </section>

    {/* Demo / Screenshot */}
<section className="mx-auto max-w-7xl px-6 pb-16">
  <div className="mx-auto max-w-3xl">
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
      {/* macOS title bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#FF5F56]" />
          <div className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
          <div className="h-3 w-3 rounded-full bg-[#27CA40]" />
        </div>
        <div className="ml-4 text-xs text-slate-500 font-medium">main.py — Skylos</div>
      </div>
      
      {/* Screenshot */}
      <Image
        src="/screenshot1.png"
        alt="Skylos VS Code Extension"
        width={1920}
        height={1080}
        quality={100}
        className="w-full h-auto"
        priority
      />
    </div>
  </div>
</section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="text-center">
          <Pill>Features</Pill>
          <h2 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
            Everything you need to ship safer code
          </h2>
          <p className="mt-3 text-slate-600">
            Combines static analysis with AI-powered detection for maximum coverage.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="text-center">
            <Pill color="emerald">How it works</Pill>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Two layers of protection</h2>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {/* Layer 1 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold">1</div>
                <div className="font-semibold text-slate-900">Skylos CLI (on save)</div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Detects dead code, unused imports, unreachable functions</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Scans for hardcoded secrets and API keys</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Flags dangerous patterns (eval, pickle, shell=True)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>100% local — no network calls</span>
                </div>
              </div>
            </div>

            {/* Layer 2 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold">2</div>
                <div className="font-semibold text-slate-900">AI Watcher (on idle)</div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  <span>Analyzes changed functions after 2s of idle</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  <span>Catches logic errors, type bugs, undefined variables</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  <span>One-click fix with diff preview</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  <span>Choose GPT-4 or Claude — your API key</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Setup */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="text-center">
          <Pill>Quick Setup</Pill>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">Up and running in 2 minutes</h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold">1</div>
            <div className="mt-4 font-semibold text-slate-900">Install the extension</div>
            <div className="mt-2 text-sm text-slate-600">
              Search "Skylos" in VS Code marketplace or click the install button above.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold">2</div>
            <div className="mt-4 font-semibold text-slate-900">Install Skylos CLI</div>
            <div className="mt-2 text-sm text-slate-600">
              <code className="rounded bg-slate-100 px-2 py-1 text-xs">pip install skylos</code>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold">3</div>
            <div className="mt-4 font-semibold text-slate-900">Add your API key</div>
            <div className="mt-2 text-sm text-slate-600">
              Settings → Skylos → Add your OpenAI or Anthropic key for AI features.
            </div>
          </div>
        </div>
      </section>

      {/* Settings Preview */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <div className="font-semibold text-slate-900">Extension Settings</div>
            <div className="text-sm text-slate-500">Customize Skylos to fit your workflow</div>
          </div>
          
          <div className="divide-y divide-slate-100">
            {[
              { name: "skylos.aiProvider", value: '"openai" | "anthropic"', desc: "Choose your AI backend" },
              { name: "skylos.openaiApiKey", value: "string", desc: "Your OpenAI API key" },
              { name: "skylos.anthropicApiKey", value: "string", desc: "Your Anthropic API key" },
              { name: "skylos.idleMs", value: "2000", desc: "Wait time before AI analysis (ms)" },
              { name: "skylos.enableSecrets", value: "true", desc: "Scan for hardcoded secrets" },
              { name: "skylos.enableDanger", value: "true", desc: "Flag dangerous code patterns" },
            ].map((setting) => (
              <div key={setting.name} className="flex items-center justify-between px-6 py-4">
                <div>
                  <code className="text-sm font-medium text-slate-900">{setting.name}</code>
                  <div className="text-sm text-slate-500">{setting.desc}</div>
                </div>
                <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{setting.value}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-10 text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Stop bugs before they ship
          </h2>
          <p className="mt-3 text-slate-400 max-w-xl mx-auto">
            Join developers using AI-powered code analysis. Free extension, open source, 
            works with your existing API keys.
          </p>
          
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="https://marketplace.visualstudio.com/items?itemName=oha.skylos-vscode-extension"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition"
            >
              <Download className="h-4 w-4" />
              Install on VS Code
            </Link>
            <Link
              href="https://docs.skylos.dev/vscode"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Read the docs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Image src={dogImg} alt="Skylos" width={24} height={24} />
              <span className="text-sm text-slate-600">Skylos · High-signal SAST for Python</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link href="/roadmap" className="hover:text-slate-900">Roadmap</Link>
              <Link href="https://docs.skylos.dev/" className="hover:text-slate-900">Docs</Link>
              <Link href="https://github.com/oha/skylos" className="hover:text-slate-900">GitHub</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}