'use client';

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";

type ProvenanceFile = {
  id: string;
  file_path: string;
  agent_authored: boolean;
  agent_name: string | null;
  agent_lines: [number, number][];
  indicators: { type: string; commit: string; detail: string }[];
};

export default function ProvenanceDetail({ scanId }: { scanId: string }) {
  const [files, setFiles] = useState<ProvenanceFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("provenance_files")
        .select("*")
        .eq("scan_id", scanId)
        .eq("agent_authored", true)
        .order("file_path");

      if (data) setFiles(data as ProvenanceFile[]);
      setLoading(false);
    };
    fetchFiles();
  }, [scanId]);

  if (loading) {
    return <div className="mt-2 text-xs text-violet-500">Loading provenance details...</div>;
  }

  if (files.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {files.map((f) => (
        <div key={f.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white border border-violet-100 text-[11px]">
          <Fingerprint className="w-3 h-3 text-violet-400 shrink-0" />
          <span className="font-mono text-violet-800 truncate flex-1">{f.file_path}</span>
          {f.agent_name && (
            <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 font-bold text-[9px] shrink-0">
              {f.agent_name}
            </span>
          )}
          {f.agent_lines && f.agent_lines.length > 0 && (
            <span className="text-violet-400 shrink-0">
              L{f.agent_lines.map(([s, e]) => s === e ? s : `${s}-${e}`).join(', ')}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
