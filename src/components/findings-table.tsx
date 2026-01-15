type Finding = {
  id: string;
  rule_id: string;
  file_path: string;
  line_number: number;
  message: string;
  severity: string;
  category: string | null;
  snippet?: string | null;
  is_new?: boolean;
  is_suppressed?: boolean;
  new_reason?: "pr-changed-line" | "pr-file-fallback" | "legacy" | "non-pr" | null;
};

const severityRank: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function reasonLabel(r?: Finding["new_reason"]) {
  if (r === "pr-changed-line") 
    return { label: "Changed line", hint: "This exact line is in the PR diff." };
  if (r === "pr-file-fallback") 
    return { label: "File fallback", hint: "File changed but patch missing; conservative." };
  if (r === "non-pr") 
    return { label: "Non-PR", hint: "No PR context; compared to main baseline." };
  return { label: "Legacy", hint: "Existing issue from before this PR." };
}

export function FindingsTable({ findings, emptyLabel }: { findings: Finding[]; emptyLabel: string }) {
  const rows = [...(findings || [])].sort((a, b) => {
    const sa = severityRank[String(a.severity || "MEDIUM").toUpperCase()] ?? 9;
    const sb = severityRank[String(b.severity || "MEDIUM").toUpperCase()] ?? 9;
    if (sa !== sb) return sa - sb;
    const fa = String(a.file_path || "");
    const fb = String(b.file_path || "");
    if (fa !== fb) return fa.localeCompare(fb);
    return (Number(a.line_number || 0) - Number(b.line_number || 0));
  });

  if (!rows.length) {
    return <div className="text-slate-400 text-sm p-6">{emptyLabel}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-slate-400">
          <tr className="border-b border-white/10">
            <th className="text-left py-3 pr-3">Status</th>
            <th className="text-left py-3 pr-3">Where</th>
            <th className="text-left py-3 pr-3">What</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => {
            const sev = String(f.severity || "MEDIUM").toUpperCase();
            const r = reasonLabel(f.new_reason || (f.is_new ? "legacy" : "legacy"));

            return (
              <tr key={f.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 pr-3 align-top">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Pill text={sev} />
                    {f.is_new ? <Pill text="NEW" /> : <Pill text="LEGACY" muted />}
                    {f.is_suppressed ? <Pill text="SUPPRESSED" muted /> : null}
                    {f.is_new ? <Chip label={r.label} hint={r.hint} /> : null}
                  </div>
                </td>

                <td className="py-3 pr-3 align-top">
                  <div className="text-slate-200 font-mono break-all">{f.file_path}</div>
                  <div className="text-slate-500 text-xs mt-1">Line {Number(f.line_number || 0)}</div>
                  {f.rule_id ? (
                    <div className="text-slate-500 text-xs mt-1">Rule {f.rule_id}</div>
                  ) : null}
                </td>

                <td className="py-3 pr-3 align-top">
                  <div className="text-slate-200">{f.message}</div>
                  {f.category ? <div className="text-slate-500 text-xs mt-1">{f.category}</div> : null}
                  {f.snippet ? (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-300 cursor-pointer">Show snippet</summary>
                      <pre className="mt-2 text-xs text-slate-300 bg-black/30 border border-white/10 rounded-lg p-3 overflow-auto">
                        {f.snippet}
                      </pre>
                    </details>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pill({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <span
      className={[
        "text-xs px-2 py-1 rounded-full border border-white/10",
        muted ? "text-slate-400 bg-black/20" : "text-slate-200 bg-white/5",
      ].join(" ")}
    >
      {text}
    </span>
  );
}

function Chip({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="group relative">
      <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-black/20 text-slate-300">
        {label}
      </span>
      <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition absolute z-10 left-0 top-full mt-2 w-64 text-xs text-slate-200 bg-[#111526] border border-white/10 rounded-lg p-3 shadow">
        {hint}
      </span>
    </span>
  );
}
