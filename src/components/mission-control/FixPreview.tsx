'use client';

export default function FixPreview({
  before,
  after,
  explanation,
}: {
  before: string;
  after: string;
  explanation: string;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Explanation */}
      <div className="px-6 py-4 bg-indigo-500/10 border-b border-indigo-500/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-semibold text-indigo-200">Suggested Fix</h3>
            <p className="text-sm text-indigo-300/80 mt-1">{explanation}</p>
          </div>
        </div>
      </div>

      {/* Diff */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {/* Before */}
        <div className="mb-4">
          <div className="text-xs text-red-400 uppercase tracking-wider mb-2">Before</div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <pre className="text-red-300 whitespace-pre-wrap">{before}</pre>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center my-2">
          <div className="text-slate-500 text-2xl">↓</div>
        </div>

        {/* After */}
        <div>
          <div className="text-xs text-emerald-400 uppercase tracking-wider mb-2">After</div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
            <pre className="text-emerald-300 whitespace-pre-wrap">{after}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}