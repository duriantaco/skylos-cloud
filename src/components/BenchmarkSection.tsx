import { Timer, AlertTriangle, Search } from 'lucide-react'

export default function BenchmarkSection() {
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
          
          {/* LEFT: The Narrative & Methodology (SEO Content) */}
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
                Vulture is faster (0.1s) but "dumb"—it missed 17% of the dead code and flagged used code as dead.
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

                  {/* Row 5: Speed (Honesty Row) */}
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