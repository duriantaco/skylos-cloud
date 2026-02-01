'use client'
import { useEffect, useMemo, useState } from "react";

type Row = {
  project_id: string;
  rule_id: string;
  file_path: string;
  line_number: number;
  reason: string | null;
  created_at: string;
  created_by: string;
  expires_at: string | null;
  revoked_at: string | null;
};

function fmtDate(x: string | null) {
  if (!x) return "—";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return x;
  return d.toLocaleString();
}

function isExpired(expires_at: string | null) {
  if (!expires_at) return false;
  const t = new Date(expires_at).getTime();
  return Number.isFinite(t) && t <= Date.now();
}

export default function SuppressionsTable({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/suppressions?includeRevoked=${includeRevoked ? "true" : "false"}`);
      const json = await res.json();
      setRows(Array.isArray(json.rows) ? json.rows : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [includeRevoked]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows
      .filter(r => includeExpired ? true : !isExpired(r.expires_at))
      .filter(r => {
        if (!qq) return true;
        const hay = `${r.rule_id} ${r.file_path} ${r.reason || ""} ${r.created_by}`.toLowerCase();
        return hay.includes(qq);
      });
  }, [rows, q, includeExpired]);

  async function revoke(r: Row) {
    const ok = confirm(`Revoke suppression?\n\n${r.rule_id} @ ${r.file_path}:${r.line_number}`);
    if (!ok) return;

    await fetch(`/api/projects/${projectId}/suppressions/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rule_id: r.rule_id,
        file_path: r.file_path,
        line_number: r.line_number,
      })
    });

    await load();
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by rule / file / reason / user..."
          className="w-full md:w-[420px] bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition shadow-sm"
        />

        <div className="flex flex-wrap gap-4 items-center text-sm text-slate-600">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={includeRevoked} onChange={(e) => setIncludeRevoked(e.target.checked)} />
            Include revoked
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={includeExpired} onChange={(e) => setIncludeExpired(e.target.checked)} />
            Include expired
          </label>
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-sm text-slate-500">Loading suppressions…</div>
      ) : filtered.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">No suppressions found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4">Where</th>
                <th className="text-left py-3 px-4">Why</th>
                <th className="text-left py-3 px-4">Meta</th>
                <th className="text-right py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const expired = isExpired(r.expires_at);
                const revoked = !!r.revoked_at;

                return (
                  <tr key={`${r.rule_id}::${r.file_path}::${r.line_number}`} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-3 px-4 align-top">
                      <div className="font-mono text-slate-900">{r.file_path}:{r.line_number}</div>
                      <div className="text-xs text-slate-500 mt-1">Rule {r.rule_id}</div>
                      <div className="flex gap-2 mt-2">
                        {revoked ? <Tag text="REVOKED" /> : <Tag text="ACTIVE" />}
                        {expired ? <Tag text="EXPIRED" /> : (r.expires_at ? <Tag text="HAS EXPIRY" /> : <Tag text="NO EXPIRY" />)}
                      </div>
                    </td>

                    <td className="py-3 px-4 align-top">
                      <div className="text-slate-800">{r.reason || "—"}</div>
                    </td>

                    <td className="py-3 px-4 align-top">
                      <div className="text-xs text-slate-500">Created: {fmtDate(r.created_at)}</div>
                      <div className="text-xs text-slate-500 mt-1">By: {r.created_by}</div>
                      <div className="text-xs text-slate-500 mt-1">Expires: {fmtDate(r.expires_at)}</div>
                      <div className="text-xs text-slate-500 mt-1">Revoked: {fmtDate(r.revoked_at)}</div>
                    </td>

                    <td className="py-3 px-4 align-top text-right">
                      <button
                        disabled={revoked}
                        onClick={() => revoke(r)}
                        className={[
                          "px-3 py-2 rounded-lg border text-sm font-medium transition",
                          revoked
                            ? "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
                            : "border-red-200 text-red-700 hover:bg-red-50"
                        ].join(" ")}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <span className="text-[11px] px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600">
      {text}
    </span>
  );
}