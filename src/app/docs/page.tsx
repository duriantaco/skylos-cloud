// app/docs/page.tsx
import Link from 'next/link'

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-white pt-28 pb-16">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Docs</h1>
        <p className="mt-3 text-slate-600">
          Quickstart + setup. Replace this page with your real docs later.
        </p>

        <div className="mt-10 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Quickstart</h2>
            <pre className="mt-3 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <code>{`pip install skylos
skylos scan .`}</code>
            </pre>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Next step</h2>
            <p className="mt-2 text-slate-600">
              Connect GitHub to run checks automatically on pull requests and enforce a quality gate.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-slate-800 transition"
            >
              Connect GitHub
            </Link>
          </section>
        </div>
      </div>
    </main>
  )
}
